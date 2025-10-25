using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading;

namespace MarkRead.App.Services;

public sealed class FileWatcherService : IDisposable
{
    private readonly ConcurrentDictionary<string, WatchedPath> _watchers = new(StringComparer.OrdinalIgnoreCase);
    private readonly TimeSpan _defaultDebounce = TimeSpan.FromMilliseconds(300);
    private bool _disposed;

    public IDisposable Watch(string path, Action<string> onChanged, TimeSpan? debounce = null)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            throw new ArgumentException("Path must be provided.", nameof(path));
        }

        if (onChanged is null)
        {
            throw new ArgumentNullException(nameof(onChanged));
        }

        var fullPath = Path.GetFullPath(path);
        var watcher = _watchers.GetOrAdd(fullPath, key => new WatchedPath(key, debounce ?? _defaultDebounce));
        var subscription = watcher.AddSubscriber(onChanged);
        return new Subscription(this, fullPath, subscription);
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        foreach (var watcher in _watchers.Values)
        {
            watcher.Dispose();
        }

        _watchers.Clear();
        _disposed = true;
    }

    private void RemoveSubscriber(string path, Guid subscriptionId)
    {
        if (_watchers.TryGetValue(path, out var watcher))
        {
            if (watcher.RemoveSubscriber(subscriptionId) && watcher.HasNoSubscribers)
            {
                if (_watchers.TryRemove(path, out var removed))
                {
                    removed.Dispose();
                }
            }
        }
    }

    private sealed class Subscription : IDisposable
    {
        private readonly FileWatcherService _service;
        private readonly string _path;
        private readonly Guid _subscriptionId;
        private bool _disposed;

        public Subscription(FileWatcherService service, string path, Guid subscriptionId)
        {
            _service = service;
            _path = path;
            _subscriptionId = subscriptionId;
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

            _service.RemoveSubscriber(_path, _subscriptionId);
            _disposed = true;
        }
    }

    private sealed class WatchedPath : IDisposable
    {
        private readonly FileSystemWatcher _watcher;
        private readonly ConcurrentDictionary<Guid, Action<string>> _subscribers = new();
        private readonly Timer _timer;
        private readonly TimeSpan _debounce;
        private string? _pendingPath;

        public WatchedPath(string path, TimeSpan debounce)
        {
            _debounce = debounce;
            _watcher = CreateWatcher(path);
            _timer = new Timer(Flush, null, Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
        }

        public Guid AddSubscriber(Action<string> callback)
        {
            var id = Guid.NewGuid();
            _subscribers[id] = callback;
            return id;
        }

        public bool RemoveSubscriber(Guid id)
        {
            return _subscribers.TryRemove(id, out _);
        }

        public bool HasNoSubscribers => _subscribers.IsEmpty;

        private FileSystemWatcher CreateWatcher(string path)
        {
            var watcher = Directory.Exists(path)
                ? new FileSystemWatcher(path)
                : new FileSystemWatcher(Path.GetDirectoryName(path) ?? path)
                {
                    Filter = Directory.Exists(path) ? "*.*" : Path.GetFileName(path)
                };

            watcher.IncludeSubdirectories = Directory.Exists(path);
            watcher.NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName;

            watcher.Changed += OnFileSystemEvent;
            watcher.Created += OnFileSystemEvent;
            watcher.Deleted += OnFileSystemEvent;
            watcher.Renamed += OnRenamed;
            watcher.EnableRaisingEvents = true;

            return watcher;
        }

        private void OnFileSystemEvent(object sender, FileSystemEventArgs e)
        {
            Schedule(e.FullPath);
        }

        private void OnRenamed(object sender, RenamedEventArgs e)
        {
            Schedule(e.FullPath);
        }

        private void Schedule(string path)
        {
            _pendingPath = path;
            _timer.Change(_debounce, Timeout.InfiniteTimeSpan);
        }

        private void Flush(object? state)
        {
            var snapshot = _pendingPath;
            _pendingPath = null;
            if (snapshot is null)
            {
                return;
            }

            foreach (var subscriber in _subscribers.Values)
            {
                try
                {
                    subscriber(snapshot);
                }
                catch
                {
                    // Ignore subscriber exceptions to avoid stopping notification flow.
                }
            }
        }

        public void Dispose()
        {
            _watcher.Dispose();
            _timer.Dispose();
        }
    }
}
