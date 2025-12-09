using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using MarkRead.App.Services;

namespace MarkRead.App.UI.Settings;

/// <summary>
/// User control for managing folder exclusion rules.
/// </summary>
public partial class FolderExclusionsView : System.Windows.Controls.UserControl
{
    private ObservableCollection<ExclusionRule> _exclusions = new();

    public event EventHandler? SettingsChanged;

    public FolderExclusionsView()
    {
        InitializeComponent();
        ExclusionsDataGrid.DataContext = _exclusions;
    }

    /// <summary>
    /// Initializes the view with the given settings.
    /// </summary>
    public void Initialize(FolderExclusionSettings settings)
    {
        _exclusions.Clear();
        
        foreach (var rule in settings.ExclusionRules)
        {
            _exclusions.Add(rule);
        }
        
        ExclusionsDataGrid.ItemsSource = _exclusions;
        UpdateStatus();
    }

    /// <summary>
    /// Gets the current settings from the UI.
    /// </summary>
    public FolderExclusionSettings GetSettings()
    {
        return new FolderExclusionSettings
        {
            ExclusionRules = _exclusions.ToList()
        };
    }

    private void AddButton_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new AddExclusionDialog
        {
            Owner = Window.GetWindow(this)
        };

        if (dialog.ShowDialog() == true)
        {
            var pattern = dialog.Pattern;
            var description = dialog.Description;

            // Check for duplicates (case-insensitive)
            if (_exclusions.Any(r => string.Equals(r.Pattern, pattern, StringComparison.OrdinalIgnoreCase)))
            {
                System.Windows.MessageBox.Show(
                    $"An exclusion rule for '{pattern}' already exists.",
                    "Duplicate Pattern",
                    System.Windows.MessageBoxButton.OK,
                    System.Windows.MessageBoxImage.Warning);
                return;
            }

            // Add new custom rule
            var newRule = new ExclusionRule(pattern, isBuiltIn: false, description: description);
            _exclusions.Add(newRule);
            
            UpdateStatus();
            SettingsChanged?.Invoke(this, EventArgs.Empty);
        }
    }

    private void DeleteButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is System.Windows.Controls.Button button && button.Tag is ExclusionRule rule)
        {
            if (rule.IsBuiltIn)
            {
                System.Windows.MessageBox.Show(
                    "Built-in exclusions cannot be deleted. You can disable them instead.",
                    "Cannot Delete",
                    System.Windows.MessageBoxButton.OK,
                    System.Windows.MessageBoxImage.Information);
                return;
            }

            var result = System.Windows.MessageBox.Show(
                $"Are you sure you want to delete the exclusion for '{rule.Pattern}'?",
                "Confirm Delete",
                System.Windows.MessageBoxButton.YesNo,
                System.Windows.MessageBoxImage.Question);

            if (result == System.Windows.MessageBoxResult.Yes)
            {
                _exclusions.Remove(rule);
                UpdateStatus();
                SettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }
    }

    private void ExclusionCheckBox_Changed(object sender, RoutedEventArgs e)
    {
        UpdateStatus();
        SettingsChanged?.Invoke(this, EventArgs.Empty);
    }

    private void UpdateStatus()
    {
        var total = _exclusions.Count;
        var enabled = _exclusions.Count(r => r.IsEnabled);
        StatusText.Text = $"{total} exclusion{(total != 1 ? "s" : "")} ({enabled} enabled)";
    }
}

/// <summary>
/// Dialog for adding a new exclusion rule.
/// </summary>
public partial class AddExclusionDialog : Window
{
    public string Pattern { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    public AddExclusionDialog()
    {
        Title = "Add Folder Exclusion";
        Width = 450;
        Height = 220;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        ResizeMode = ResizeMode.NoResize;
        ShowInTaskbar = false;

        var grid = new Grid
        {
            Margin = new Thickness(20)
        };
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

        // Pattern label
        var patternLabel = new TextBlock
        {
            Text = "Folder Pattern:",
            Margin = new Thickness(0, 0, 0, 4)
        };
        patternLabel.SetResourceReference(TextBlock.ForegroundProperty, "ThemeTextPrimaryBrush");
        Grid.SetRow(patternLabel, 0);
        grid.Children.Add(patternLabel);

        // Pattern textbox
        var patternTextBox = new System.Windows.Controls.TextBox
        {
            Name = "PatternTextBox",
            Margin = new Thickness(0, 0, 0, 12)
        };
        Grid.SetRow(patternTextBox, 1);
        grid.Children.Add(patternTextBox);

        // Description label
        var descLabel = new TextBlock
        {
            Text = "Description (optional):",
            Margin = new Thickness(0, 0, 0, 4)
        };
        descLabel.SetResourceReference(TextBlock.ForegroundProperty, "ThemeTextPrimaryBrush");
        Grid.SetRow(descLabel, 2);
        grid.Children.Add(descLabel);

        // Description textbox
        var descTextBox = new System.Windows.Controls.TextBox
        {
            Name = "DescriptionTextBox",
            Margin = new Thickness(0, 0, 0, 12)
        };
        Grid.SetRow(descTextBox, 3);
        grid.Children.Add(descTextBox);

        // Spacer
        Grid.SetRow(new Border(), 4);

        // Buttons
        var buttonPanel = new StackPanel
        {
            Orientation = System.Windows.Controls.Orientation.Horizontal,
            HorizontalAlignment = System.Windows.HorizontalAlignment.Right,
            Margin = new Thickness(0, 12, 0, 0)
        };
        Grid.SetRow(buttonPanel, 5);

        var okButton = new System.Windows.Controls.Button
        {
            Content = "Add",
            IsDefault = true,
            Margin = new Thickness(0, 0, 8, 0),
            Padding = new Thickness(24, 8, 24, 8),
            MinWidth = 80
        };
        okButton.Click += (s, e) =>
        {
            Pattern = patternTextBox.Text.Trim();
            Description = string.IsNullOrWhiteSpace(descTextBox.Text) ? null : descTextBox.Text.Trim();

            if (string.IsNullOrWhiteSpace(Pattern))
            {
                System.Windows.MessageBox.Show(
                    "Please enter a folder pattern.",
                    "Validation Error",
                    System.Windows.MessageBoxButton.OK,
                    System.Windows.MessageBoxImage.Warning);
                return;
            }

            // Validate pattern (no invalid characters)
            var invalidChars = System.IO.Path.GetInvalidFileNameChars();
            if (Pattern.IndexOfAny(invalidChars) >= 0)
            {
                System.Windows.MessageBox.Show(
                    "Pattern contains invalid characters.",
                    "Validation Error",
                    System.Windows.MessageBoxButton.OK,
                    System.Windows.MessageBoxImage.Warning);
                return;
            }

            DialogResult = true;
            Close();
        };
        buttonPanel.Children.Add(okButton);

        var cancelButton = new System.Windows.Controls.Button
        {
            Content = "Cancel",
            IsCancel = true,
            Padding = new Thickness(24, 8, 24, 8),
            MinWidth = 80
        };
        buttonPanel.Children.Add(cancelButton);

        grid.Children.Add(buttonPanel);

        Content = grid;
        
        // Apply theme
        this.SetResourceReference(BackgroundProperty, "ThemeBackgroundBrush");
        
        // Focus pattern textbox when loaded
        Loaded += (s, e) => patternTextBox.Focus();
    }
}
