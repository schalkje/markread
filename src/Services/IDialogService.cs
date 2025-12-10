namespace MarkRead.Services;

/// <summary>
/// Service for displaying dialogs to the user
/// </summary>
public interface IDialogService
{
    /// <summary>
    /// Shows an error dialog with helpful context
    /// </summary>
    Task ShowErrorAsync(string title, string message, string? details = null);
    
    /// <summary>
    /// Shows a confirmation dialog
    /// </summary>
    Task<bool> ShowConfirmationAsync(string title, string message, string confirmText = "Yes", string cancelText = "No");
    
    /// <summary>
    /// Shows an information dialog
    /// </summary>
    Task ShowInfoAsync(string title, string message);
    
    /// <summary>
    /// Shows a warning dialog
    /// </summary>
    Task ShowWarningAsync(string title, string message);
}
