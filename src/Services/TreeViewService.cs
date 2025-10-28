using System.IO;

namespace MarkRead.App.Services;

/// <summary>
/// Service for building and managing the folder/file tree structure.
/// </summary>
public class TreeViewService
{
    private readonly HistoryService _historyService;
    private readonly SettingsService _settingsService;

    public TreeViewService(HistoryService historyService, SettingsService settingsService)
    {
        _historyService = historyService;
        _settingsService = settingsService;
    }

    /// <summary>
    /// Builds the tree structure asynchronously by scanning directories for markdown files.
    /// </summary>
    /// <param name="rootPath">Root folder path to scan.</param>
    /// <param name="progress">Optional progress reporter.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Root TreeNode.</returns>
    public async Task<TreeNode> BuildTreeAsync(
        string rootPath,
        IProgress<int>? progress = null,
        CancellationToken cancellationToken = default)
    {
        return await Task.Run(() =>
        {
            var rootDir = new DirectoryInfo(rootPath);
            if (!rootDir.Exists)
            {
                throw new DirectoryNotFoundException($"Root path does not exist: {rootPath}");
            }

            var root = new TreeNode
            {
                Name = rootDir.Name,
                FullPath = rootDir.FullName,
                Type = NodeType.Folder,
                Parent = null,
                IsExpanded = false
            };

            BuildTreeRecursive(root, rootDir, progress, cancellationToken);
            return root;
        }, cancellationToken);
    }

    /// <summary>
    /// Recursively builds the tree structure for a directory.
    /// </summary>
    private void BuildTreeRecursive(TreeNode parentNode, DirectoryInfo dir, IProgress<int>? progress, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            // Get subdirectories that contain markdown files
            var subdirs = dir.GetDirectories()
                .Where(d => !IsHiddenOrSystem(d) && HasMarkdownFiles(d))
                .OrderBy(d => d.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();

            // Get markdown files in current directory
            var markdownFiles = dir.GetFiles("*.md")
                .Concat(dir.GetFiles("*.markdown"))
                .Where(f => !IsHiddenOrSystem(f))
                .OrderBy(f => f.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();

            // Add folders first (sorted alphabetically)
            foreach (var subdir in subdirs)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var folderNode = new TreeNode
                {
                    Name = subdir.Name,
                    FullPath = subdir.FullName,
                    Type = NodeType.Folder,
                    Parent = parentNode,
                    IsExpanded = false
                };

                parentNode.Children.Add(folderNode);
                BuildTreeRecursive(folderNode, subdir, progress, cancellationToken);
            }

            // Add files (sorted alphabetically)
            foreach (var file in markdownFiles)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var fileNode = new TreeNode
                {
                    Name = file.Name,
                    FullPath = file.FullName,
                    Type = NodeType.File,
                    Parent = parentNode,
                    IsExpanded = false
                };

                parentNode.Children.Add(fileNode);
                progress?.Report(1);
            }
        }
        catch (UnauthorizedAccessException)
        {
            // Skip directories we don't have permission to access
        }
        catch (DirectoryNotFoundException)
        {
            // Skip directories that were deleted during scan
        }
    }

    /// <summary>
    /// Checks if a file or directory is hidden or system.
    /// </summary>
    private static bool IsHiddenOrSystem(FileSystemInfo info)
    {
        return (info.Attributes & FileAttributes.Hidden) != 0 ||
               (info.Attributes & FileAttributes.System) != 0;
    }

    /// <summary>
    /// Determines which file should be initially displayed when opening a folder.
    /// Cascade: HistoryService last viewed → README.md → first alphabetical.
    /// </summary>
    /// <param name="folderPath">Folder path to analyze.</param>
    /// <returns>Path to initial file, or null if no markdown files found.</returns>
    public async Task<string?> DetermineInitialFileAsync(string folderPath)
    {
        return await Task.Run(() =>
        {
            // TODO: Check HistoryService for last viewed file once we integrate with it
            // For now, skip to README.md check

            // Check for README.md in root folder
            var readmePath = Path.Combine(folderPath, "README.md");
            if (File.Exists(readmePath))
            {
                return readmePath;
            }

            // Get all markdown files recursively and return first alphabetically
            var dir = new DirectoryInfo(folderPath);
            if (!dir.Exists)
            {
                return null;
            }

            var markdownFiles = GetAllMarkdownFiles(dir)
                .OrderBy(f => f, StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault();

            return markdownFiles;
        });
    }

    /// <summary>
    /// Gets all markdown files recursively from a directory.
    /// </summary>
    private IEnumerable<string> GetAllMarkdownFiles(DirectoryInfo dir)
    {
        if (!dir.Exists)
        {
            yield break;
        }

        // Get markdown files in current directory
        foreach (var file in dir.GetFiles("*.md").Concat(dir.GetFiles("*.markdown")))
        {
            if (!IsHiddenOrSystem(file))
            {
                yield return file.FullName;
            }
        }

        // Recursively get files from subdirectories
        foreach (var subdir in dir.GetDirectories())
        {
            if (!IsHiddenOrSystem(subdir))
            {
                foreach (var file in GetAllMarkdownFiles(subdir))
                {
                    yield return file;
                }
            }
        }
    }

    /// <summary>
    /// Saves treeview visibility preference for a specific folder.
    /// </summary>
    /// <param name="folderPath">Folder path.</param>
    /// <param name="isVisible">Visibility state.</param>
    public void SaveVisibilityPreference(string folderPath, bool isVisible)
    {
        // T044: Update settings asynchronously (fire and forget for UI responsiveness)
        _ = Task.Run(async () =>
        {
            await _settingsService.UpdateTreeViewSettingsAsync(settings =>
            {
                if (!settings.PerFolderSettings.ContainsKey(folderPath))
                {
                    settings.PerFolderSettings[folderPath] = new FolderTreeSettings();
                }

                settings.PerFolderSettings[folderPath].IsVisible = isVisible;
                return settings;
            });
        });
    }

    /// <summary>
    /// Loads treeview visibility preference for a specific folder.
    /// Returns global default if no per-folder setting exists.
    /// </summary>
    /// <param name="folderPath">Folder path.</param>
    /// <returns>Visibility state (true if visible).</returns>
    public bool LoadVisibilityPreference(string folderPath)
    {
        // T045: Load synchronously from cached settings
        // Note: This assumes settings are loaded during app startup
        var settings = _settingsService.LoadTreeViewSettingsAsync().GetAwaiter().GetResult();

        if (settings.PerFolderSettings.TryGetValue(folderPath, out var folderSettings))
        {
            return folderSettings.IsVisible;
        }

        return settings.DefaultVisible;
    }

    /// <summary>
    /// Recursively checks if a directory contains markdown files (directly or in descendants).
    /// </summary>
    /// <param name="dirInfo">Directory to check.</param>
    /// <returns>True if markdown files found.</returns>
    private bool HasMarkdownFiles(DirectoryInfo dirInfo)
    {
        try
        {
            // Check for markdown files directly in this directory
            if (dirInfo.GetFiles("*.md").Any(f => !IsHiddenOrSystem(f)) ||
                dirInfo.GetFiles("*.markdown").Any(f => !IsHiddenOrSystem(f)))
            {
                return true;
            }

            // Recursively check subdirectories
            foreach (var subdir in dirInfo.GetDirectories().Where(d => !IsHiddenOrSystem(d)))
            {
                if (HasMarkdownFiles(subdir))
                {
                    return true;
                }
            }

            return false;
        }
        catch (UnauthorizedAccessException)
        {
            // Can't access directory, assume no markdown files
            return false;
        }
        catch (DirectoryNotFoundException)
        {
            // Directory was deleted during scan
            return false;
        }
    }

    /// <summary>
    /// Handles file system changes and updates the tree structure accordingly.
    /// T034: Update tree structure (Created: add node, Deleted: remove node, Renamed: update name)
    /// T036: Prune empty folders after file deletion
    /// </summary>
    /// <param name="root">Root tree node.</param>
    /// <param name="eventArgs">File system event arguments.</param>
    public void HandleFileSystemChange(TreeNode root, FileSystemEventArgs eventArgs)
    {
        if (root == null || eventArgs == null)
        {
            return;
        }

        switch (eventArgs.ChangeType)
        {
            case WatcherChangeTypes.Created:
                HandleFileCreated(root, eventArgs.FullPath);
                break;

            case WatcherChangeTypes.Deleted:
                HandleFileDeleted(root, eventArgs.FullPath);
                break;

            case WatcherChangeTypes.Renamed:
                if (eventArgs is RenamedEventArgs renamedArgs)
                {
                    HandleFileRenamed(root, renamedArgs.OldFullPath, renamedArgs.FullPath);
                }
                break;
        }
    }

    /// <summary>
    /// Handles file creation by adding a new node to the tree.
    /// </summary>
    private void HandleFileCreated(TreeNode root, string filePath)
    {
        try
        {
            var fileInfo = new FileInfo(filePath);
            if (!fileInfo.Exists || IsHiddenOrSystem(fileInfo))
            {
                return;
            }

            // Find or create parent folder nodes
            var parentPath = fileInfo.DirectoryName;
            if (string.IsNullOrEmpty(parentPath))
            {
                return;
            }

            var parentNode = FindOrCreateFolderNode(root, parentPath);
            if (parentNode == null)
            {
                return;
            }

            // Check if file already exists in tree (avoid duplicates)
            if (parentNode.Children.Any(c => c.FullPath.Equals(filePath, StringComparison.OrdinalIgnoreCase)))
            {
                return;
            }

            // Create and add the new file node
            var newNode = new TreeNode
            {
                Name = fileInfo.Name,
                FullPath = fileInfo.FullName,
                Type = NodeType.File,
                Parent = parentNode,
                IsExpanded = false
            };

            // Insert in alphabetical order (files come after folders)
            InsertNodeSorted(parentNode, newNode);
        }
        catch (Exception)
        {
            // Ignore errors (file might be deleted during processing)
        }
    }

    /// <summary>
    /// Handles file deletion by removing the node from the tree.
    /// T036: Prune parent folders if they become empty.
    /// </summary>
    private void HandleFileDeleted(TreeNode root, string filePath)
    {
        var node = FindNode(root, filePath);
        if (node == null || node.Parent == null)
        {
            return;
        }

        var parent = node.Parent;
        parent.Children.Remove(node);

        // T036: Prune empty parent folders recursively
        PruneEmptyFolders(parent);
    }

    /// <summary>
    /// Handles file rename by updating the node's name and path.
    /// </summary>
    private void HandleFileRenamed(TreeNode root, string oldPath, string newPath)
    {
        var node = FindNode(root, oldPath);
        if (node == null)
        {
            // Node not found, treat as creation
            HandleFileCreated(root, newPath);
            return;
        }

        // Update node properties
        node.FullPath = newPath;
        node.Name = Path.GetFileName(newPath);

        // If moved to different folder, update parent
        var newParentPath = Path.GetDirectoryName(newPath);
        var oldParentPath = Path.GetDirectoryName(oldPath);

        if (!string.Equals(newParentPath, oldParentPath, StringComparison.OrdinalIgnoreCase))
        {
            // Remove from old parent
            var oldParent = node.Parent;
            if (oldParent != null)
            {
                oldParent.Children.Remove(node);
                PruneEmptyFolders(oldParent);
            }

            // Add to new parent
            if (!string.IsNullOrEmpty(newParentPath))
            {
                var newParent = FindOrCreateFolderNode(root, newParentPath);
                if (newParent != null)
                {
                    node.Parent = newParent;
                    InsertNodeSorted(newParent, node);
                }
            }
        }
        else if (node.Parent != null)
        {
            // Same parent, just reorder
            var parent = node.Parent;
            parent.Children.Remove(node);
            InsertNodeSorted(parent, node);
        }
    }

    /// <summary>
    /// Finds a node in the tree by path.
    /// </summary>
    private TreeNode? FindNode(TreeNode root, string path)
    {
        if (root.FullPath.Equals(path, StringComparison.OrdinalIgnoreCase))
        {
            return root;
        }

        foreach (var child in root.Children)
        {
            var found = FindNode(child, path);
            if (found != null)
            {
                return found;
            }
        }

        return null;
    }

    /// <summary>
    /// Finds or creates folder nodes along the path.
    /// </summary>
    private TreeNode? FindOrCreateFolderNode(TreeNode root, string folderPath)
    {
        if (root.FullPath.Equals(folderPath, StringComparison.OrdinalIgnoreCase))
        {
            return root;
        }

        // Get relative path from root
        var rootPath = root.FullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        if (!folderPath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
        {
            return null; // Path not under root
        }

        var relativePath = folderPath.Substring(rootPath.Length).TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var segments = relativePath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

        var currentNode = root;
        var currentPath = rootPath;

        foreach (var segment in segments)
        {
            if (string.IsNullOrEmpty(segment))
            {
                continue;
            }

            currentPath = Path.Combine(currentPath, segment);

            // Find existing child folder
            var childNode = currentNode.Children.FirstOrDefault(c =>
                c.Type == NodeType.Folder &&
                c.FullPath.Equals(currentPath, StringComparison.OrdinalIgnoreCase));

            if (childNode == null)
            {
                // Create new folder node
                childNode = new TreeNode
                {
                    Name = segment,
                    FullPath = currentPath,
                    Type = NodeType.Folder,
                    Parent = currentNode,
                    IsExpanded = false
                };

                InsertNodeSorted(currentNode, childNode);
            }

            currentNode = childNode;
        }

        return currentNode;
    }

    /// <summary>
    /// Inserts a node in alphabetical order (folders before files).
    /// </summary>
    private void InsertNodeSorted(TreeNode parent, TreeNode newNode)
    {
        var insertIndex = 0;

        foreach (var child in parent.Children)
        {
            // Folders come before files
            if (newNode.Type == NodeType.Folder && child.Type == NodeType.File)
            {
                break;
            }

            if (newNode.Type == NodeType.File && child.Type == NodeType.Folder)
            {
                insertIndex++;
                continue;
            }

            // Within same type, sort alphabetically (case-insensitive)
            if (string.Compare(newNode.Name, child.Name, StringComparison.OrdinalIgnoreCase) < 0)
            {
                break;
            }

            insertIndex++;
        }

        parent.Children.Insert(insertIndex, newNode);
    }

    /// <summary>
    /// T036: Recursively removes empty parent folders that no longer contain markdown files.
    /// </summary>
    private void PruneEmptyFolders(TreeNode? node)
    {
        if (node == null || node.Parent == null)
        {
            return; // Don't remove root
        }

        // If folder has no children and no markdown files, remove it
        if (node.Type == NodeType.Folder && node.Children.Count == 0)
        {
            var parent = node.Parent;
            parent.Children.Remove(node);

            // Recursively prune parent if it's now empty
            PruneEmptyFolders(parent);
        }
    }
}
