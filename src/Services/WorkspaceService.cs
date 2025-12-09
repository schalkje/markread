using MarkRead.Models;
using System.Collections.ObjectModel;

namespace MarkRead.Services;

/// <summary>
/// Manages workspace folders (multiple root folders) in the application
/// </summary>
public class WorkspaceService : IWorkspaceService
{
    private readonly ObservableCollection<WorkspaceFolder> _workspaces = new();
    private readonly ILoggingService _loggingService;
    private readonly ITabService _tabService;
    private WorkspaceFolder? _activeWorkspace;

    public IReadOnlyList<WorkspaceFolder> WorkspaceFolders => _workspaces;
    public WorkspaceFolder? ActiveWorkspace => _activeWorkspace;

    public event EventHandler<WorkspaceFolder>? WorkspaceOpened;
    public event EventHandler<WorkspaceFolder>? WorkspaceClosed;
    public event EventHandler<WorkspaceFolder>? ActiveWorkspaceChanged;

    public WorkspaceService(ILoggingService loggingService, ITabService tabService)
    {
        _loggingService = loggingService;
        _tabService = tabService;
    }

    public WorkspaceFolder OpenWorkspace(string folderPath, bool setActive = true)
    {
        if (string.IsNullOrWhiteSpace(folderPath))
            throw new ArgumentException("Folder path cannot be empty", nameof(folderPath));

        if (!Directory.Exists(folderPath))
            throw new DirectoryNotFoundException($"Folder not found: {folderPath}");

        // Check if workspace already open
        var existing = _workspaces.FirstOrDefault(w => 
            string.Equals(w.Path, folderPath, StringComparison.OrdinalIgnoreCase));
        
        if (existing != null)
        {
            _loggingService.LogInfo($"Workspace already open: {folderPath}");
            if (setActive)
            {
                SwitchToWorkspace(existing.Id);
            }
            return existing;
        }

        // Create new workspace
        var workspace = new WorkspaceFolder
        {
            Path = folderPath,
            Name = Path.GetFileName(folderPath) ?? folderPath,
            IsActive = setActive,
            OpenedAt = DateTime.Now,
            LastAccessed = DateTime.Now
        };

        _workspaces.Add(workspace);
        _loggingService.LogInfo($"Workspace opened: {workspace.Name} ({workspace.Path})");

        if (setActive)
        {
            SetActiveWorkspace(workspace);
        }

        WorkspaceOpened?.Invoke(this, workspace);
        return workspace;
    }

    public void CloseWorkspace(string workspaceId)
    {
        var workspace = GetWorkspace(workspaceId);
        if (workspace == null)
        {
            _loggingService.LogWarning($"Workspace not found for closing: {workspaceId}");
            return;
        }

        // Close all tabs associated with this workspace
        var workspaceTabs = GetTabsForWorkspace(workspaceId);
        foreach (var tabId in workspaceTabs)
        {
            _tabService.CloseTab(tabId);
        }

        _workspaces.Remove(workspace);
        _loggingService.LogInfo($"Workspace closed: {workspace.Name}");

        // If this was the active workspace, switch to another or set to null
        if (_activeWorkspace?.Id == workspaceId)
        {
            _activeWorkspace = _workspaces.FirstOrDefault();
            if (_activeWorkspace != null)
            {
                ActiveWorkspaceChanged?.Invoke(this, _activeWorkspace);
            }
        }

        WorkspaceClosed?.Invoke(this, workspace);
    }

    public void SwitchToWorkspace(string workspaceId)
    {
        var workspace = GetWorkspace(workspaceId);
        if (workspace == null)
        {
            _loggingService.LogWarning($"Workspace not found for switching: {workspaceId}");
            return;
        }

        SetActiveWorkspace(workspace);
    }

    public WorkspaceFolder? GetWorkspace(string workspaceId)
    {
        return _workspaces.FirstOrDefault(w => w.Id == workspaceId);
    }

    public WorkspaceFolder? GetWorkspaceForFile(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
            return null;

        // Find the workspace whose path is a parent of the file path
        return _workspaces
            .OrderByDescending(w => w.Path.Length) // Prefer more specific (deeper) paths
            .FirstOrDefault(w => filePath.StartsWith(w.Path, StringComparison.OrdinalIgnoreCase));
    }

    public List<string> GetTabsForWorkspace(string workspaceId)
    {
        var workspace = GetWorkspace(workspaceId);
        if (workspace == null)
            return new List<string>();

        // Get all tabs whose DocumentPath belongs to this workspace
        return _tabService.Tabs
            .Where(tab => !string.IsNullOrEmpty(tab.DocumentPath) &&
                         tab.DocumentPath.StartsWith(workspace.Path, StringComparison.OrdinalIgnoreCase))
            .Select(tab => tab.Id)
            .ToList();
    }

    private void SetActiveWorkspace(WorkspaceFolder workspace)
    {
        if (_activeWorkspace?.Id == workspace.Id)
            return;

        // Deactivate previous workspace
        if (_activeWorkspace != null)
        {
            _activeWorkspace.IsActive = false;
        }

        // Activate new workspace
        workspace.IsActive = true;
        workspace.LastAccessed = DateTime.Now;
        _activeWorkspace = workspace;

        _loggingService.LogInfo($"Active workspace changed: {workspace.Name}");
        ActiveWorkspaceChanged?.Invoke(this, workspace);
    }
}
