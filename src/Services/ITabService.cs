using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Service for managing document tabs
/// </summary>
public interface ITabService
{
    /// <summary>
    /// All open tabs
    /// </summary>
    IReadOnlyList<DocumentTab> Tabs { get; }

    /// <summary>
    /// Currently active tab
    /// </summary>
    DocumentTab? ActiveTab { get; }

    /// <summary>
    /// Event raised when a tab is opened
    /// </summary>
    event EventHandler<DocumentTab>? TabOpened;

    /// <summary>
    /// Event raised when a tab is closed
    /// </summary>
    event EventHandler<DocumentTab>? TabClosed;

    /// <summary>
    /// Event raised when the active tab changes
    /// </summary>
    event EventHandler<DocumentTab>? ActiveTabChanged;

    /// <summary>
    /// Event raised when tabs are reordered
    /// </summary>
    event EventHandler? TabsReordered;

    /// <summary>
    /// Opens a new tab with the specified document path
    /// </summary>
    /// <param name="documentPath">Path to the document</param>
    /// <param name="workspaceFolder">Workspace folder this tab belongs to (optional)</param>
    /// <param name="setActive">Whether to make this tab active</param>
    DocumentTab OpenTab(string documentPath, string? workspaceFolder = null, bool setActive = true);

    /// <summary>
    /// Closes the specified tab
    /// </summary>
    bool CloseTab(string tabId);

    /// <summary>
    /// Closes all tabs
    /// </summary>
    void CloseAllTabs();

    /// <summary>
    /// Closes all tabs except the specified one
    /// </summary>
    void CloseOtherTabs(string tabId);

    /// <summary>
    /// Switches to the specified tab
    /// </summary>
    bool SwitchToTab(string tabId);

    /// <summary>
    /// Switches to the next tab
    /// </summary>
    bool SwitchToNextTab();

    /// <summary>
    /// Switches to the previous tab
    /// </summary>
    bool SwitchToPreviousTab();

    /// <summary>
    /// Switches to tab by index (1-based for Ctrl+1-9)
    /// </summary>
    bool SwitchToTabByIndex(int index);

    /// <summary>
    /// Reorders tabs
    /// </summary>
    void ReorderTabs(int oldIndex, int newIndex);

    /// <summary>
    /// Pins or unpins a tab
    /// </summary>
    void TogglePinTab(string tabId);

    /// <summary>
    /// Gets tab by ID
    /// </summary>
    DocumentTab? GetTab(string tabId);

    /// <summary>
    /// Reopens the last closed tab
    /// </summary>
    DocumentTab? ReopenLastClosedTab();
}
