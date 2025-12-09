using MarkRead.Models;

namespace MarkRead.Views;

public partial class SessionRecoveryPage : ContentPage
{
    private readonly SessionState _sessionState;
    private bool _shouldRestore;

    public bool ShouldRestore => _shouldRestore;

    public SessionRecoveryPage(SessionState sessionState)
    {
        InitializeComponent();
        _sessionState = sessionState;
        _shouldRestore = false;

        LoadSessionDetails();
    }

    private void LoadSessionDetails()
    {
        // Update tab count
        TabCountLabel.Text = _sessionState.OpenTabs.Count == 1 
            ? "1 tab" 
            : $"{_sessionState.OpenTabs.Count} tabs";

        // Update workspace count
        WorkspaceCountLabel.Text = _sessionState.WorkspaceFolders.Count == 1
            ? "1 folder"
            : $"{_sessionState.WorkspaceFolders.Count} folders";

        // Update last saved time
        var timeSinceLastSave = DateTime.UtcNow - _sessionState.LastSaved;
        LastSavedLabel.Text = FormatTimeSince(timeSinceLastSave);
    }

    private string FormatTimeSince(TimeSpan timeSpan)
    {
        if (timeSpan.TotalMinutes < 1)
            return "Just now";
        if (timeSpan.TotalMinutes < 60)
            return $"{(int)timeSpan.TotalMinutes} minutes ago";
        if (timeSpan.TotalHours < 24)
            return $"{(int)timeSpan.TotalHours} hours ago";
        
        return $"{(int)timeSpan.TotalDays} days ago";
    }

    private async void OnRestoreClicked(object sender, EventArgs e)
    {
        _shouldRestore = true;
        await CloseModalAsync();
    }

    private async void OnStartFreshClicked(object sender, EventArgs e)
    {
        _shouldRestore = false;
        await CloseModalAsync();
    }

    private async Task CloseModalAsync()
    {
        // Fade out animation
        await Task.WhenAll(
            this.FadeToAsync(0, 200, Easing.CubicIn),
            this.ScaleToAsync(0.95, 200, Easing.CubicIn)
        );

        // Navigate back
        await Navigation.PopModalAsync(false);
    }
}
