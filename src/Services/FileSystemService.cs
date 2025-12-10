using System.Collections.Concurrent;
using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// File system operations with change watching, debouncing, and error handling
/// </summary>
public class FileSystemService : IFileSystemService
{
    private readonly ConcurrentDictionary<string, FileSystemWatcher> _watchers = new();
    private readonly ConcurrentDictionary<string, Timer> _debounceTimers = new();
    private readonly FolderExclusion _folderExclusion = new();
    private const int DebounceDelayMs = 300; // 300ms debounce for file changes

    public async Task<string> ReadFileAsync(string filePath)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File not found: {filePath}");
        }

        return await File.ReadAllTextAsync(filePath);
    }

    public async Task<FileTreeNode> LoadDirectoryAsync(string path)
    {
        return await Task.Run(() => LoadDirectory(path, 0));
    }

    private FileTreeNode LoadDirectory(string path, int level)
    {
        var dirInfo = new DirectoryInfo(path);
        var node = new FileTreeNode
        {
            Path = path,
            Name = dirInfo.Name,
            Type = FileTreeNodeType.Directory,
            Level = level,
            IsExpanded = level == 0, // Auto-expand root
            HasPermissionError = false
        };

        try
        {
            // Load subdirectories
            foreach (var subDir in dirInfo.GetDirectories())
            {
                // Skip excluded folders using FolderExclusion
                if (_folderExclusion.ShouldExclude(subDir.Name))
                    continue;

                // Skip hidden folders
                if (subDir.Attributes.HasFlag(FileAttributes.Hidden))
                    continue;

                try
                {
                    var childNode = LoadDirectory(subDir.FullName, level + 1);
                    childNode.Parent = node;
                    node.Children.Add(childNode);
                }
                catch (UnauthorizedAccessException)
                {
                    // Add node with permission error marker
                    var errorNode = new FileTreeNode
                    {
                        Path = subDir.FullName,
                        Name = subDir.Name,
                        Type = FileTreeNodeType.Directory,
                        Level = level + 1,
                        Parent = node,
                        HasPermissionError = true
                    };
                    node.Children.Add(errorNode);
                }
            }

            // Load markdown files
            foreach (var file in dirInfo.GetFiles("*.md"))
            {
                var fileNode = new FileTreeNode
                {
                    Path = file.FullName,
                    Name = file.Name,
                    Type = FileTreeNodeType.File,
                    Level = level + 1,
                    Parent = node,
                    HasPermissionError = false
                };
                node.Children.Add(fileNode);
            }

            // Sort: directories first, then files, alphabetically
            node.Children = node.Children
                .OrderBy(n => n.Type == FileTreeNodeType.File)
                .ThenBy(n => n.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
        catch (UnauthorizedAccessException)
        {
            // Mark this node as having permission error
            node.HasPermissionError = true;
        }

        return node;
    }

    public IDisposable WatchFile(string filePath, Action<string> onChanged)
    {
        var directory = Path.GetDirectoryName(filePath) ?? throw new ArgumentException("Invalid file path");
        var fileName = Path.GetFileName(filePath);

        var watcher = new FileSystemWatcher(directory, fileName)
        {
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size,
            EnableRaisingEvents = true
        };

        // Debounced change handler
        watcher.Changed += (s, e) =>
        {
            var key = e.FullPath;
            
            // Cancel existing timer for this file
            if (_debounceTimers.TryRemove(key, out var existingTimer))
            {
                existingTimer.Dispose();
            }

            // Create new timer that fires after debounce delay
            var timer = new Timer(_ =>
            {
                onChanged(key);
                if (_debounceTimers.TryRemove(key, out var t))
                {
                    t.Dispose();
                }
            }, null, DebounceDelayMs, Timeout.Infinite);

            _debounceTimers[key] = timer;
        };

        _watchers[filePath] = watcher;

        return new FileWatcherDisposable(() =>
        {
            if (_watchers.TryRemove(filePath, out var w))
            {
                w.Dispose();
            }
            if (_debounceTimers.TryRemove(filePath, out var t))
            {
                t.Dispose();
            }
        });
    }

    public bool FileExists(string filePath) => File.Exists(filePath);

    public DateTime GetFileModifiedTime(string filePath) =>
        File.Exists(filePath) ? File.GetLastWriteTime(filePath) : DateTime.MinValue;

    private class FileWatcherDisposable : IDisposable
    {
        private readonly Action _dispose;
        public FileWatcherDisposable(Action dispose) => _dispose = dispose;
        public void Dispose() => _dispose();
    }
}
