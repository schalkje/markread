using System.Collections.Concurrent;
using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// File system operations with change watching
/// </summary>
public class FileSystemService : IFileSystemService
{
    private readonly ConcurrentDictionary<string, FileSystemWatcher> _watchers = new();
    private readonly HashSet<string> _excludedFolders = new()
    {
        ".git", "node_modules", "bin", "obj", ".vscode", ".env", "venv", "__pycache__"
    };

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
            IsExpanded = level == 0 // Auto-expand root
        };

        try
        {
            // Load subdirectories
            foreach (var subDir in dirInfo.GetDirectories())
            {
                // Skip excluded folders
                if (_excludedFolders.Contains(subDir.Name.ToLowerInvariant()))
                    continue;

                // Skip hidden folders
                if (subDir.Attributes.HasFlag(FileAttributes.Hidden))
                    continue;

                var childNode = LoadDirectory(subDir.FullName, level + 1);
                childNode.Parent = node;
                node.Children.Add(childNode);
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
                    Parent = node
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
            // Skip directories we don't have permission to access
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

        watcher.Changed += (s, e) => onChanged(e.FullPath);

        _watchers[filePath] = watcher;

        return new FileWatcherDisposable(() =>
        {
            if (_watchers.TryRemove(filePath, out var w))
            {
                w.Dispose();
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
