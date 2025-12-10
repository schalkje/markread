namespace MarkRead.Services;

/// <summary>
/// MAUI implementation of dialog service
/// </summary>
public class DialogService : IDialogService
{
    /// <inheritdoc/>
    public async Task ShowErrorAsync(string title, string message, string? details = null)
    {
        var fullMessage = string.IsNullOrEmpty(details) 
            ? message 
            : $"{message}\n\nDetails:\n{details}";
        
        if (Application.Current?.Windows?.FirstOrDefault()?.Page != null)
        {
            await Application.Current.Windows[0].Page.DisplayAlertAsync(
                $"❌ {title}", 
                fullMessage, 
                "OK");
        }
    }
    
    /// <inheritdoc/>
    public async Task<bool> ShowConfirmationAsync(string title, string message, string confirmText = "Yes", string cancelText = "No")
    {
        if (Application.Current?.Windows?.FirstOrDefault()?.Page != null)
        {
            return await Application.Current.Windows[0].Page.DisplayAlertAsync(
                $"❓ {title}", 
                message, 
                confirmText, 
                cancelText);
        }
        return false;
    }
    
    /// <inheritdoc/>
    public async Task ShowInfoAsync(string title, string message)
    {
        var page = Application.Current?.Windows?.FirstOrDefault()?.Page;
        if (page != null)
        {
            await page.DisplayAlertAsync(
                $"ℹ️ {title}", 
                message, 
                "OK");
        }
    }
    
    /// <inheritdoc/>
    public async Task ShowWarningAsync(string title, string message)
    {
        if (Application.Current?.Windows?.FirstOrDefault()?.Page != null)
        {
            await Application.Current.Windows[0].Page.DisplayAlertAsync(
                $"⚠️ {title}", 
                message, 
                "OK");
        }
    }
}
