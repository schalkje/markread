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
        // TODO: Implement in T010
        await Task.CompletedTask;
        throw new NotImplementedException("BuildTreeAsync will be implemented in T010");
    }

    /// <summary>
    /// Determines which file should be initially displayed when opening a folder.
    /// Cascade: HistoryService last viewed → README.md → first alphabetical.
    /// </summary>
    /// <param name="folderPath">Folder path to analyze.</param>
    /// <returns>Path to initial file, or null if no markdown files found.</returns>
    public async Task<string?> DetermineInitialFileAsync(string folderPath)
    {
        // TODO: Implement in T014
        await Task.CompletedTask;
        throw new NotImplementedException("DetermineInitialFileAsync will be implemented in T014");
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
        // TODO: Implement in T011
        throw new NotImplementedException("HasMarkdownFiles will be implemented in T011");
    }
}
