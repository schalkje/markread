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
        // TODO: Implement in T044
        throw new NotImplementedException("SaveVisibilityPreference will be implemented in T044");
    }

    /// <summary>
    /// Loads treeview visibility preference for a specific folder.
    /// Returns global default if no per-folder setting exists.
    /// </summary>
    /// <param name="folderPath">Folder path.</param>
    /// <returns>Visibility state (true if visible).</returns>
    public bool LoadVisibilityPreference(string folderPath)
    {
        // TODO: Implement in T045
        throw new NotImplementedException("LoadVisibilityPreference will be implemented in T045");
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
}
