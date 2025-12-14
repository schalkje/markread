using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Service for managing workspace folders (multiple root folders)
/// </summary>
public interface IWorkspaceService
{
    /// <summary>
    /// Gets the list of currently open workspace folders
    /// </summary>
    IReadOnlyList<WorkspaceFolder> WorkspaceFolders { get; }

    /// <summary>
    /// Gets the currently active workspace folder
    /// </summary>
    WorkspaceFolder? ActiveWorkspace { get; }

    /// <summary>
    /// Event raised when a workspace folder is opened
    /// </summary>
    event EventHandler<WorkspaceFolder>? WorkspaceOpened;

    /// <summary>
    /// Event raised when a workspace folder is closed
    /// </summary>
    event EventHandler<WorkspaceFolder>? WorkspaceClosed;

    /// <summary>
    /// Event raised when the active workspace changes
    /// </summary>
    event EventHandler<WorkspaceFolder>? ActiveWorkspaceChanged;

    /// <summary>
    /// Opens a new workspace folder
    /// </summary>
    /// <param name="folderPath">Path to the root folder</param>
    /// <param name="setActive">Whether to make this the active workspace</param>
    /// <returns>The opened workspace folder</returns>
    WorkspaceFolder OpenWorkspace(string folderPath, bool setActive = true);

    /// <summary>
    /// Closes a workspace folder and all its associated tabs
    /// </summary>
    /// <param name="workspaceId">ID of the workspace to close</param>
    void CloseWorkspace(string workspaceId);

    /// <summary>
    /// Switches to a different workspace folder
    /// </summary>
    /// <param name="workspaceId">ID of the workspace to activate</param>
    void SwitchToWorkspace(string workspaceId);

    /// <summary>
    /// Gets a workspace folder by ID
    /// </summary>
    WorkspaceFolder? GetWorkspace(string workspaceId);

    /// <summary>
    /// Gets the workspace folder that contains a given file path
    /// </summary>
    WorkspaceFolder? GetWorkspaceForFile(string filePath);

    /// <summary>
    /// Gets all tabs belonging to a specific workspace
    /// </summary>
    List<string> GetTabsForWorkspace(string workspaceId);
    
    /// <summary>
    /// Gets the root path of the active workspace, or null if no workspace is active
    /// </summary>
    string? RootPath => ActiveWorkspace?.Path;
    
    /// <summary>
    /// Sets the root workspace folder (opens as active workspace)
    /// </summary>
    Task SetRootAsync(string folderPath);
}
