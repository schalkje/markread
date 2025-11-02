using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading;

namespace MarkRead.App.Services;

public sealed class FileWatcherService : IDisposable
{
    private readonly ConcurrentDictionary<string, WatchedPath> _watchers = new(StringComparer.OrdinalIgnoreCase);
    private readonly TimeSpan _defaultDebounce = TimeSpan.FromMilliseconds(300);
    private readonly TimeSpan _markdownDebounce = TimeSpan.FromMilliseconds(500);
    private bool _disposed;

    /// <summary>
    /// Watches markdown files (*.md, *.markdown) for Created, Deleted, and Renamed events.
    /// Optimized for tree view scenarios with 500ms debouncing.
    /// </summary>
    public IDisposable WatchMarkdownFiles(string folderPath, Action<FileSystemEventArgs> onChanged)
    {
        if (string.IsNullOrWhiteSpace(folderPath))
        {
            throw new ArgumentException("Folder path must be provided.", nameof(folderPath));
        }

        if (onChanged is null)
        {
            throw new ArgumentNullException(nameof(onChanged));
        }

        if (!Directory.Exists(folderPath))
        {
            throw new DirectoryNotFoundException($"Folder not found: {folderPath}");
        }

        var fullPath = Path.GetFullPath(folderPath);
        var watcherKey = $"md:{fullPath}"; // Prefix to distinguish from generic watchers
        var watcher = _watchers.GetOrAdd(watcherKey, key => new WatchedPath(
            fullPath, 
            _markdownDebounce, 
            isMarkdownSpecific: true));
        var subscription = watcher.AddMarkdownSubscriber(onChanged);
        return new Subscription(this, watcherKey, subscription);
    }

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
        private readonly ConcurrentDictionary<Guid, Action<FileSystemEventArgs>> _markdownSubscribers = new();
        private readonly System.Threading.Timer _timer;
        private readonly TimeSpan _debounce;
        private string? _pendingPath;
        private FileSystemEventArgs? _pendingEventArgs;
        private readonly bool _isMarkdownSpecific;

        public WatchedPath(string path, TimeSpan debounce, bool isMarkdownSpecific = false)
        {
            _debounce = debounce;
            _isMarkdownSpecific = isMarkdownSpecific;
            _watcher = CreateWatcher(path, isMarkdownSpecific);
            _timer = new System.Threading.Timer(Flush, null, Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
        }

        public Guid AddSubscriber(Action<string> callback)
        {
            var id = Guid.NewGuid();
            _subscribers[id] = callback;
            return id;
        }

        public Guid AddMarkdownSubscriber(Action<FileSystemEventArgs> callback)
        {
            var id = Guid.NewGuid();
            _markdownSubscribers[id] = callback;
            return id;
        }

        public bool RemoveSubscriber(Guid id)
        {
            return _subscribers.TryRemove(id, out _) || _markdownSubscribers.TryRemove(id, out _);
        }

        public bool HasNoSubscribers => _subscribers.IsEmpty && _markdownSubscribers.IsEmpty;

        private FileSystemWatcher CreateWatcher(string path, bool isMarkdownSpecific)
        {
            var watcher = Directory.Exists(path)
                ? new FileSystemWatcher(path)
                : new FileSystemWatcher(Path.GetDirectoryName(path) ?? path)
                {
                    Filter = Directory.Exists(path) ? "*.*" : Path.GetFileName(path)
                };

            watcher.IncludeSubdirectories = Directory.Exists(path);
            
            if (isMarkdownSpecific)
            {
                // T032: Watch only Created, Deleted, Renamed for markdown files
                watcher.NotifyFilter = NotifyFilters.FileName | NotifyFilters.DirectoryName;
                // Note: Filter property only supports single pattern, so we'll filter in event handlers
                watcher.Filter = "*.*"; // Watch all, filter in handlers
                watcher.InternalBufferSize = 65536; // 64KB to prevent buffer overflow
            }
            else
            {
                watcher.NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName;
            }

            watcher.Created += OnFileSystemEvent;
            watcher.Deleted += OnFileSystemEvent;
            watcher.Renamed += OnRenamed;
            
            if (!isMarkdownSpecific)
            {
                watcher.Changed += OnFileSystemEvent;
            }
            
            watcher.Error += OnError;
            watcher.EnableRaisingEvents = true;

            return watcher;
        }

        private void OnFileSystemEvent(object sender, FileSystemEventArgs e)
        {
            // T031: Filter markdown files (*.md, *.markdown)
            if (_isMarkdownSpecific)
            {
                var ext = Path.GetExtension(e.FullPath);
                if (!string.Equals(ext, ".md", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(ext, ".markdown", StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }
            }
            
            Schedule(e.FullPath, e);
        }

        private void OnRenamed(object sender, RenamedEventArgs e)
        {
            // T031: Filter markdown files
            if (_isMarkdownSpecific)
            {
                var ext = Path.GetExtension(e.FullPath);
                if (!string.Equals(ext, ".md", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(ext, ".markdown", StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }
            }
            
            Schedule(e.FullPath, e);
        }

        private void OnError(object sender, ErrorEventArgs e)
        {
            // Log error and attempt recovery by restarting watcher
            // In production, this would log to a proper logging system
            if (e.GetException() != null)
            {
                // Buffer overflow or other error - restart watcher
                _watcher.EnableRaisingEvents = false;
                _watcher.EnableRaisingEvents = true;
            }
        }

        private void Schedule(string path, FileSystemEventArgs? eventArgs = null)
        {
            // T033: 500ms debouncing for markdown watchers
            _pendingPath = path;
            _pendingEventArgs = eventArgs;
            _timer.Change(_debounce, Timeout.InfiniteTimeSpan);
        }

        private void Flush(object? state)
        {
            var snapshot = _pendingPath;
            var eventSnapshot = _pendingEventArgs;
            _pendingPath = null;
            _pendingEventArgs = null;
            
            if (snapshot is null)
            {
                return;
            }

            // Notify markdown subscribers with full event args
            if (eventSnapshot != null)
            {
                foreach (var subscriber in _markdownSubscribers.Values)
                {
                    try
                    {
                        subscriber(eventSnapshot);
                    }
                    catch
                    {
                        // Ignore subscriber exceptions to avoid stopping notification flow.
                    }
                }
            }

            // Notify generic subscribers with just the path
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
