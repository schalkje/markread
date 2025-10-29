using System;
using System.ComponentModel;
using System.Threading.Tasks;

namespace MarkRead.Services
{
    /// <summary>
    /// Service interface for managing search operations and visibility (T070).
    /// Provides unified interface for in-page and global search functionality.
    /// </summary>
    public interface ISearchService : INotifyPropertyChanged
    {
        /// <summary>
        /// Gets whether the in-page search bar is currently visible.
        /// </summary>
        bool InPageSearchVisible { get; }

        /// <summary>
        /// Gets whether the global search panel is currently visible.
        /// </summary>
        bool GlobalSearchVisible { get; }

        /// <summary>
        /// Event raised when in-page search visibility changes.
        /// </summary>
        event EventHandler<SearchVisibilityEventArgs> InPageSearchVisibilityChanged;

        /// <summary>
        /// Event raised when global search visibility changes.
        /// </summary>
        event EventHandler<SearchVisibilityEventArgs> GlobalSearchVisibilityChanged;

        /// <summary>
        /// Shows the in-page search bar with animation.
        /// Hides global search if visible (mutual exclusion).
        /// </summary>
        Task ShowInPageSearchAsync();

        /// <summary>
        /// Hides the in-page search bar with animation.
        /// </summary>
        Task HideInPageSearchAsync();

        /// <summary>
        /// Shows the global search panel with animation.
        /// Hides in-page search if visible (mutual exclusion).
        /// </summary>
        Task ShowGlobalSearchAsync();

        /// <summary>
        /// Hides the global search panel with animation.
        /// </summary>
        Task HideGlobalSearchAsync();

        /// <summary>
        /// Toggles in-page search visibility.
        /// </summary>
        Task ToggleInPageSearchAsync();

        /// <summary>
        /// Toggles global search visibility.
        /// </summary>
        Task ToggleGlobalSearchAsync();
    }

    /// <summary>
    /// Event arguments for search visibility changes.
    /// </summary>
    public class SearchVisibilityEventArgs : EventArgs
    {
        public bool IsVisible { get; set; }
        public SearchType SearchType { get; set; }
    }

    /// <summary>
    /// Type of search interface.
    /// </summary>
    public enum SearchType
    {
        InPage,
        Global
    }

    /// <summary>
    /// Implementation of search service managing visibility and state (T070).
    /// </summary>
    public class SearchService : ISearchService
    {
        private bool _inPageSearchVisible;
        private bool _globalSearchVisible;

        public event PropertyChangedEventHandler? PropertyChanged;
        public event EventHandler<SearchVisibilityEventArgs>? InPageSearchVisibilityChanged;
        public event EventHandler<SearchVisibilityEventArgs>? GlobalSearchVisibilityChanged;

        /// <summary>
        /// Gets whether the in-page search bar is currently visible.
        /// </summary>
        public bool InPageSearchVisible
        {
            get => _inPageSearchVisible;
            private set
            {
                if (_inPageSearchVisible != value)
                {
                    _inPageSearchVisible = value;
                    OnPropertyChanged(nameof(InPageSearchVisible));
                    InPageSearchVisibilityChanged?.Invoke(this, new SearchVisibilityEventArgs
                    {
                        IsVisible = value,
                        SearchType = SearchType.InPage
                    });
                }
            }
        }

        /// <summary>
        /// Gets whether the global search panel is currently visible.
        /// </summary>
        public bool GlobalSearchVisible
        {
            get => _globalSearchVisible;
            private set
            {
                if (_globalSearchVisible != value)
                {
                    _globalSearchVisible = value;
                    OnPropertyChanged(nameof(GlobalSearchVisible));
                    GlobalSearchVisibilityChanged?.Invoke(this, new SearchVisibilityEventArgs
                    {
                        IsVisible = value,
                        SearchType = SearchType.Global
                    });
                }
            }
        }

        /// <summary>
        /// Shows the in-page search bar with animation.
        /// Hides global search if visible (mutual exclusion).
        /// </summary>
        public async Task ShowInPageSearchAsync()
        {
            // Hide global search if visible (mutual exclusion)
            if (GlobalSearchVisible)
            {
                await HideGlobalSearchAsync();
            }

            if (!InPageSearchVisible)
            {
                InPageSearchVisible = true;
                // Animation will be handled by UI component listening to visibility change
                await Task.CompletedTask;
            }
        }

        /// <summary>
        /// Hides the in-page search bar with animation.
        /// </summary>
        public async Task HideInPageSearchAsync()
        {
            if (InPageSearchVisible)
            {
                InPageSearchVisible = false;
                // Animation will be handled by UI component listening to visibility change
                await Task.CompletedTask;
            }
        }

        /// <summary>
        /// Shows the global search panel with animation.
        /// Hides in-page search if visible (mutual exclusion).
        /// </summary>
        public async Task ShowGlobalSearchAsync()
        {
            // Hide in-page search if visible (mutual exclusion)
            if (InPageSearchVisible)
            {
                await HideInPageSearchAsync();
            }

            if (!GlobalSearchVisible)
            {
                GlobalSearchVisible = true;
                // Animation will be handled by UI component listening to visibility change
                await Task.CompletedTask;
            }
        }

        /// <summary>
        /// Hides the global search panel with animation.
        /// </summary>
        public async Task HideGlobalSearchAsync()
        {
            if (GlobalSearchVisible)
            {
                GlobalSearchVisible = false;
                // Animation will be handled by UI component listening to visibility change
                await Task.CompletedTask;
            }
        }

        /// <summary>
        /// Toggles in-page search visibility.
        /// </summary>
        public async Task ToggleInPageSearchAsync()
        {
            if (InPageSearchVisible)
            {
                await HideInPageSearchAsync();
            }
            else
            {
                await ShowInPageSearchAsync();
            }
        }

        /// <summary>
        /// Toggles global search visibility.
        /// </summary>
        public async Task ToggleGlobalSearchAsync()
        {
            if (GlobalSearchVisible)
            {
                await HideGlobalSearchAsync();
            }
            else
            {
                await ShowGlobalSearchAsync();
            }
        }

        protected virtual void OnPropertyChanged(string propertyName)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
