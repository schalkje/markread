using System;
using System.ComponentModel;
using System.Threading.Tasks;
using MarkRead.App.Services;

namespace MarkRead.Services
{
    /// <summary>
    /// Service interface for UI state management operations
    /// </summary>
    public interface IUIStateService : INotifyPropertyChanged
    {
        /// <summary>
        /// Gets the current UI state cache
        /// </summary>
        UIState CurrentState { get; }

        /// <summary>
        /// Persist UI layout state
        /// </summary>
        Task<bool> SaveUIState(UIState state);

        /// <summary>
        /// Restore UI layout state
        /// </summary>
        Task<UIState> LoadUIState();

        /// <summary>
        /// Clear saved state and return to defaults
        /// </summary>
        Task<UIState> ResetToDefaults();

        /// <summary>
        /// Update current state and persist automatically
        /// </summary>
        Task UpdateCurrentState(Action<UIState> updater);
    }

    /// <summary>
    /// Implementation of UI state service for managing application layout state
    /// </summary>
    public class UIStateService : IUIStateService, INotifyPropertyChanged
    {
        private readonly SettingsService _settingsService;
        private UIState _currentState;

        public event PropertyChangedEventHandler? PropertyChanged;

        /// <summary>
        /// Gets the current UI state cache
        /// </summary>
        public UIState CurrentState
        {
            get => _currentState;
            private set
            {
                if (_currentState != value)
                {
                    _currentState = value;
                    OnPropertyChanged(nameof(CurrentState));
                }
            }
        }

        public UIStateService(SettingsService settingsService)
        {
            _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
            _currentState = UIState.CreateDefault();
        }

        /// <summary>
        /// Initialize the service by loading saved state
        /// </summary>
        public async Task InitializeAsync()
        {
            CurrentState = await LoadUIState();
        }

        /// <summary>
        /// Persist UI layout state
        /// </summary>
        public async Task<bool> SaveUIState(UIState state)
        {
            if (state == null)
                throw new ArgumentNullException(nameof(state));

            if (!state.IsValid())
                return false;

            try
            {
                state.LastModified = DateTime.UtcNow;
                await _settingsService.SaveUIStateAsync(state);
                CurrentState = state;
                return true;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Restore UI layout state
        /// </summary>
        public async Task<UIState> LoadUIState()
        {
            try
            {
                var state = await _settingsService.LoadUIStateAsync();
                CurrentState = state;
                return state;
            }
            catch
            {
                var defaultState = UIState.CreateDefault();
                CurrentState = defaultState;
                return defaultState;
            }
        }

        /// <summary>
        /// Clear saved state and return to defaults
        /// </summary>
        public async Task<UIState> ResetToDefaults()
        {
            try
            {
                var defaultState = UIState.CreateDefault();
                await SaveUIState(defaultState);
                return defaultState;
            }
            catch
            {
                var defaultState = UIState.CreateDefault();
                CurrentState = defaultState;
                return defaultState;
            }
        }

        /// <summary>
        /// Update current state and persist automatically
        /// </summary>
        public async Task UpdateCurrentState(Action<UIState> updater)
        {
            if (updater == null)
                throw new ArgumentNullException(nameof(updater));

            var newState = CurrentState.Clone();
            updater(newState);
            
            if (newState.IsValid())
            {
                await SaveUIState(newState);
            }
        }

        /// <summary>
        /// Update sidebar state
        /// </summary>
        public async Task UpdateSidebarState(bool collapsed, double? width = null)
        {
            await UpdateCurrentState(state =>
            {
                state.SidebarCollapsed = collapsed;
                if (width.HasValue && width.Value >= 200 && width.Value <= 500)
                {
                    state.SidebarWidth = width.Value;
                }
            });
        }

        /// <summary>
        /// Update window bounds
        /// </summary>
        public async Task UpdateWindowBounds(System.Drawing.Rectangle bounds)
        {
            await UpdateCurrentState(state =>
            {
                state.WindowBounds = bounds;
            });
        }

        /// <summary>
        /// Add a new tab
        /// </summary>
        public async Task AddTab(string tabId)
        {
            if (string.IsNullOrEmpty(tabId))
                throw new ArgumentException("Tab ID cannot be null or empty", nameof(tabId));

            await UpdateCurrentState(state =>
            {
                state.AddTab(tabId);
            });
        }

        /// <summary>
        /// Remove a tab
        /// </summary>
        public async Task RemoveTab(string tabId)
        {
            if (string.IsNullOrEmpty(tabId))
                return;

            await UpdateCurrentState(state =>
            {
                state.RemoveTab(tabId);
            });
        }

        /// <summary>
        /// Set the active tab
        /// </summary>
        public async Task SetActiveTab(string tabId)
        {
            await UpdateCurrentState(state =>
            {
                state.SetActiveTab(tabId);
            });
        }

        /// <summary>
        /// Update the last navigation path
        /// </summary>
        public async Task UpdateLastNavigationPath(string path)
        {
            if (string.IsNullOrEmpty(path))
                return;

            await UpdateCurrentState(state =>
            {
                state.LastFileNavigationPath = path;
            });
        }

        protected virtual void OnPropertyChanged(string propertyName)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}