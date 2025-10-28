using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;

namespace MarkRead.Services
{
    /// <summary>
    /// Maintains user interface layout and interaction state
    /// </summary>
    public class UIState
    {
        /// <summary>
        /// Gets or sets the sidebar visibility state
        /// </summary>
        public bool SidebarCollapsed { get; set; } = false;

        /// <summary>
        /// Gets or sets the sidebar width in pixels (when visible)
        /// </summary>
        public double SidebarWidth { get; set; } = 300;

        /// <summary>
        /// Gets or sets the window position and size
        /// </summary>
        public Rectangle WindowBounds { get; set; } = new Rectangle(100, 100, 1200, 800);

        /// <summary>
        /// Gets or sets the currently selected tab identifier
        /// </summary>
        public string ActiveTabId { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets all open tab identifiers in order
        /// </summary>
        public List<string> OpenTabIds { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets the most recent file location
        /// </summary>
        public string LastFileNavigationPath { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the last time the UI state was modified
        /// </summary>
        public DateTime LastModified { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Validates that the UI state contains valid values
        /// </summary>
        public bool IsValid()
        {
            // Sidebar width validation
            if (SidebarWidth < 200 || SidebarWidth > 500)
                return false;

            // Window bounds validation (basic sanity check)
            if (WindowBounds.Width < 400 || WindowBounds.Height < 300)
                return false;

            // Tab consistency validation
            if (!string.IsNullOrEmpty(ActiveTabId) && OpenTabIds.Count > 0)
            {
                if (!OpenTabIds.Contains(ActiveTabId))
                    return false;
            }

            // Active tab should be empty if no tabs are open
            if (OpenTabIds.Count == 0 && !string.IsNullOrEmpty(ActiveTabId))
                return false;

            return true;
        }

        /// <summary>
        /// Adds a new tab to the open tabs list
        /// </summary>
        public void AddTab(string tabId)
        {
            if (string.IsNullOrEmpty(tabId))
                throw new ArgumentException("Tab ID cannot be null or empty", nameof(tabId));

            if (!OpenTabIds.Contains(tabId))
            {
                OpenTabIds.Add(tabId);
                ActiveTabId = tabId;
                LastModified = DateTime.UtcNow;
            }
        }

        /// <summary>
        /// Removes a tab from the open tabs list
        /// </summary>
        public void RemoveTab(string tabId)
        {
            if (string.IsNullOrEmpty(tabId))
                return;

            var index = OpenTabIds.IndexOf(tabId);
            if (index == -1)
                return;

            OpenTabIds.RemoveAt(index);
            LastModified = DateTime.UtcNow;

            // Update active tab if the removed tab was active
            if (ActiveTabId == tabId)
            {
                if (OpenTabIds.Count > 0)
                {
                    // Select the tab at the same index, or the last tab if index is out of bounds
                    var newIndex = Math.Min(index, OpenTabIds.Count - 1);
                    ActiveTabId = OpenTabIds[newIndex];
                }
                else
                {
                    ActiveTabId = string.Empty;
                }
            }
        }

        /// <summary>
        /// Sets the active tab
        /// </summary>
        public void SetActiveTab(string tabId)
        {
            if (string.IsNullOrEmpty(tabId))
            {
                ActiveTabId = string.Empty;
                LastModified = DateTime.UtcNow;
                return;
            }

            if (OpenTabIds.Contains(tabId))
            {
                ActiveTabId = tabId;
                LastModified = DateTime.UtcNow;
            }
            else
            {
                throw new ArgumentException($"Tab '{tabId}' is not in the open tabs list", nameof(tabId));
            }
        }

        /// <summary>
        /// Creates a default UI state with reasonable initial values
        /// </summary>
        public static UIState CreateDefault()
        {
            return new UIState
            {
                SidebarCollapsed = false,
                SidebarWidth = 300,
                WindowBounds = new Rectangle(100, 100, 1200, 800),
                ActiveTabId = string.Empty,
                OpenTabIds = new List<string>(),
                LastFileNavigationPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                LastModified = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Creates a copy of the current UI state
        /// </summary>
        public UIState Clone()
        {
            return new UIState
            {
                SidebarCollapsed = this.SidebarCollapsed,
                SidebarWidth = this.SidebarWidth,
                WindowBounds = this.WindowBounds,
                ActiveTabId = this.ActiveTabId,
                OpenTabIds = new List<string>(this.OpenTabIds),
                LastFileNavigationPath = this.LastFileNavigationPath,
                LastModified = this.LastModified
            };
        }
    }
}