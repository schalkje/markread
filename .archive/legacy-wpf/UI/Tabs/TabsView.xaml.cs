using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Controls;

using WpfUserControl = System.Windows.Controls.UserControl;

namespace MarkRead.App.UI.Tabs;

public partial class TabsView : WpfUserControl
{
    public static readonly DependencyProperty TabsProperty = DependencyProperty.Register(
        nameof(Tabs),
        typeof(ObservableCollection<TabItem>),
        typeof(TabsView),
        new PropertyMetadata(null));

    public static readonly DependencyProperty ActiveTabProperty = DependencyProperty.Register(
        nameof(ActiveTab),
        typeof(TabItem),
        typeof(TabsView),
        new PropertyMetadata(null));

    public TabsView()
    {
        InitializeComponent();
        Tabs = new ObservableCollection<TabItem>();
        
        // Monitor scroll viewer to show/hide scroll buttons
        Loaded += (s, e) => UpdateScrollButtonVisibility();
        TabsContainer.SizeChanged += (s, e) => UpdateScrollButtonVisibility();
    }

    public ObservableCollection<TabItem> Tabs
    {
        get => (ObservableCollection<TabItem>)GetValue(TabsProperty);
        set => SetValue(TabsProperty, value);
    }

    public TabItem? ActiveTab
    {
        get => (TabItem?)GetValue(ActiveTabProperty);
        set
        {
            var oldTab = ActiveTab;
            SetValue(ActiveTabProperty, value);
            
            // Update IsActive flags
            if (oldTab != null)
            {
                oldTab.IsActive = false;
            }
            if (value != null)
            {
                value.IsActive = true;
            }
        }
    }

    public event EventHandler<TabEventArgs>? TabClosed;
    public event EventHandler<TabEventArgs>? TabCreated;
    public event EventHandler<TabEventArgs>? TabActivated;

    private void OnNewTabClicked(object sender, RoutedEventArgs e)
    {
        var newTab = new TabItem(Guid.NewGuid(), "New Tab");
        Tabs.Add(newTab);
        ActiveTab = newTab;
        TabCreated?.Invoke(this, new TabEventArgs(newTab));
    }

    private void OnTabClicked(object sender, System.Windows.Input.MouseButtonEventArgs e)
    {
        if (sender is System.Windows.FrameworkElement element && element.DataContext is TabItem tab)
        {
            ActiveTab = tab;
            TabActivated?.Invoke(this, new TabEventArgs(tab));
            e.Handled = true; // Prevent event from bubbling
        }
    }

    private void OnCloseTabClicked(object sender, RoutedEventArgs e)
    {
        if (sender is System.Windows.Controls.Button button && button.DataContext is TabItem tab)
        {
            var index = Tabs.IndexOf(tab);
            Tabs.Remove(tab);

            // Activate adjacent tab if available
            if (Tabs.Count > 0 && ActiveTab == tab)
            {
                var newIndex = Math.Min(index, Tabs.Count - 1);
                ActiveTab = Tabs[newIndex];
            }

            TabClosed?.Invoke(this, new TabEventArgs(tab));
        }
    }

    public TabItem CreateTab(string title, string? documentPath = null)
    {
        var tab = new TabItem(Guid.NewGuid(), title, documentPath);
        Tabs.Add(tab);
        ActiveTab = tab;
        TabCreated?.Invoke(this, new TabEventArgs(tab));
        return tab;
    }

    public void CloseTab(Guid tabId)
    {
        var tab = Tabs.FirstOrDefault(t => t.Id == tabId);
        if (tab != null)
        {
            Tabs.Remove(tab);
            TabClosed?.Invoke(this, new TabEventArgs(tab));

            if (Tabs.Count > 0 && ActiveTab == tab)
            {
                ActiveTab = Tabs[^1];
            }
        }
    }

    public void ActivateTab(Guid tabId)
    {
        var tab = Tabs.FirstOrDefault(t => t.Id == tabId);
        if (tab != null)
        {
            ActiveTab = tab;
            TabActivated?.Invoke(this, new TabEventArgs(tab));
        }
    }

    private void OnScrollLeftClicked(object sender, RoutedEventArgs e)
    {
        // Scroll left by 200 pixels
        TabScrollViewer.ScrollToHorizontalOffset(TabScrollViewer.HorizontalOffset - 200);
        UpdateScrollButtonVisibility();
    }

    private void OnScrollRightClicked(object sender, RoutedEventArgs e)
    {
        // Scroll right by 200 pixels
        TabScrollViewer.ScrollToHorizontalOffset(TabScrollViewer.HorizontalOffset + 200);
        UpdateScrollButtonVisibility();
    }

    private void UpdateScrollButtonVisibility()
    {
        if (TabScrollViewer == null)
            return;

        // Show scroll buttons if content is wider than viewport
        var showScrollButtons = TabScrollViewer.ScrollableWidth > 0;
        
        ScrollLeftButton.Visibility = showScrollButtons ? Visibility.Visible : Visibility.Collapsed;
        ScrollRightButton.Visibility = showScrollButtons ? Visibility.Visible : Visibility.Collapsed;

        // Disable left button if at start
        ScrollLeftButton.IsEnabled = TabScrollViewer.HorizontalOffset > 0;
        
        // Disable right button if at end
        ScrollRightButton.IsEnabled = TabScrollViewer.HorizontalOffset < TabScrollViewer.ScrollableWidth;
    }
}

public sealed class TabEventArgs : EventArgs
{
    public TabEventArgs(TabItem tab)
    {
        Tab = tab;
    }

    public TabItem Tab { get; }
}
