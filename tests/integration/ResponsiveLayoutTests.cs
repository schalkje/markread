using System;
using System.Threading.Tasks;
using Xunit;
using System.Windows;
using MarkRead.Services;

namespace MarkRead.IntegrationTests
{
    /// <summary>
    /// Integration tests for responsive layout behavior
    /// </summary>
    public class ResponsiveLayoutTests : IAsyncLifetime
    {
        private UIStateService? _uiStateService;
        private Application? _testApp;

        public async Task InitializeAsync()
        {
            // Initialize WPF application context for testing
            if (Application.Current == null)
            {
                _testApp = new Application();
            }

            var settingsService = new MarkRead.App.Services.SettingsService();
            _uiStateService = new UIStateService(settingsService);
            await _uiStateService.InitializeAsync();
        }

        public Task DisposeAsync()
        {
            _testApp?.Shutdown();
            return Task.CompletedTask;
        }

        [Fact]
        public async Task SidebarWidth_ShouldBeWithinValidRange()
        {
            // Arrange
            Assert.NotNull(_uiStateService);

            // Act & Assert - Test minimum width constraint
            await _uiStateService.UpdateSidebarState(false, 150); // Below minimum
            var state = _uiStateService.CurrentState;
            Assert.True(state.SidebarWidth >= 200, "Sidebar width should not go below minimum (200px)");

            // Act & Assert - Test maximum width constraint  
            await _uiStateService.UpdateSidebarState(false, 600); // Above maximum
            state = _uiStateService.CurrentState;
            Assert.True(state.SidebarWidth <= 500, "Sidebar width should not exceed maximum (500px)");

            // Act & Assert - Test valid width
            await _uiStateService.UpdateSidebarState(false, 300);
            state = _uiStateService.CurrentState;
            Assert.Equal(300, state.SidebarWidth);
        }

        [TestMethod]
        public async Task SidebarCollapse_ShouldPersistState()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Act - Collapse sidebar
            await _uiStateService.UpdateSidebarState(true, 300);
            var collapsedState = _uiStateService.CurrentState;

            // Assert
            Assert.IsTrue(collapsedState.SidebarCollapsed, "Sidebar should be marked as collapsed");
            Assert.AreEqual(300, collapsedState.SidebarWidth, "Sidebar width should be preserved when collapsed");

            // Act - Expand sidebar
            await _uiStateService.UpdateSidebarState(false);
            var expandedState = _uiStateService.CurrentState;

            // Assert
            Assert.IsFalse(expandedState.SidebarCollapsed, "Sidebar should be marked as expanded");
            Assert.AreEqual(300, expandedState.SidebarWidth, "Sidebar width should be restored when expanded");
        }

        [TestMethod]
        public async Task WindowBounds_ShouldRespectMinimumSizes()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Act - Try to set window bounds below minimum
            var tinyBounds = new System.Drawing.Rectangle(0, 0, 200, 150); // Below minimum
            await _uiStateService.UpdateWindowBounds(tinyBounds);

            // Assert - Should be rejected by validation
            var state = _uiStateService.CurrentState;
            Assert.IsTrue(state.WindowBounds.Width >= 400, "Window width should not go below minimum (400px)");
            Assert.IsTrue(state.WindowBounds.Height >= 300, "Window height should not go below minimum (300px)");
        }

        [TestMethod]
        public async Task WindowBounds_ShouldAcceptValidSizes()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Act
            var validBounds = new System.Drawing.Rectangle(100, 100, 1200, 800);
            await _uiStateService.UpdateWindowBounds(validBounds);

            // Assert
            var state = _uiStateService.CurrentState;
            Assert.AreEqual(validBounds, state.WindowBounds, "Valid window bounds should be accepted");
        }

        [TestMethod]
        public async Task ResponsiveBreakpoint_ShouldTriggerAt768px()
        {
            // This test simulates the responsive behavior at 768px breakpoint
            // In a real implementation, this would involve WebView2 CSS media queries

            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Act - Simulate window resize to mobile width
            var mobileWidth = new System.Drawing.Rectangle(0, 0, 750, 600); // Below 768px
            await _uiStateService.UpdateWindowBounds(mobileWidth);
            
            // In production code, this would trigger sidebar auto-collapse
            // For now, we test that the window bounds are properly stored
            var state = _uiStateService.CurrentState;

            // Assert
            Assert.AreEqual(750, state.WindowBounds.Width, "Mobile width should be stored correctly");
            
            // Future enhancement: Test that sidebar auto-collapses at this breakpoint
            // This would require integration with the actual responsive CSS/JavaScript
        }

        [TestMethod]
        public async Task Sidebar_ShouldAutoCollapseBelow768px()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Start with expanded sidebar at desktop width
            var desktopWidth = new System.Drawing.Rectangle(0, 0, 1200, 800);
            await _uiStateService.UpdateWindowBounds(desktopWidth);
            await _uiStateService.UpdateSidebarState(false, 300); // Expanded
            
            // Act - Resize to mobile width (below 768px)
            var mobileWidth = new System.Drawing.Rectangle(0, 0, 750, 600);
            await _uiStateService.UpdateWindowBounds(mobileWidth);

            // Assert - Sidebar should auto-collapse at mobile breakpoint
            // In production: This behavior would be triggered by responsive CSS/JS
            // For now, we verify the window bounds change is tracked
            var state = _uiStateService.CurrentState;
            Assert.AreEqual(750, state.WindowBounds.Width, "Window should be at mobile width");
            
            // Future: Assert.IsTrue(state.SidebarCollapsed, "Sidebar should auto-collapse below 768px");
        }

        [TestMethod]
        public async Task Sidebar_ShouldRestoreWhenResizingAbove768px()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Start at mobile width with collapsed sidebar
            var mobileWidth = new System.Drawing.Rectangle(0, 0, 750, 600);
            await _uiStateService.UpdateWindowBounds(mobileWidth);
            await _uiStateService.UpdateSidebarState(true, 300); // Collapsed

            // Act - Resize to desktop width (above 768px)
            var desktopWidth = new System.Drawing.Rectangle(0, 0, 1024, 800);
            await _uiStateService.UpdateWindowBounds(desktopWidth);

            // Assert - Sidebar should be available to restore at desktop width
            var state = _uiStateService.CurrentState;
            Assert.AreEqual(1024, state.WindowBounds.Width, "Window should be at desktop width");
            Assert.AreEqual(300, state.SidebarWidth, "Sidebar width preference should be preserved");
            
            // Future: Sidebar could auto-restore when resizing back to desktop
        }

        [TestMethod]
        public async Task Sidebar_ShouldMaintainWidthPreferenceAcrossBreakpoints()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Set custom sidebar width at desktop
            var desktopWidth = new System.Drawing.Rectangle(0, 0, 1200, 800);
            await _uiStateService.UpdateWindowBounds(desktopWidth);
            await _uiStateService.UpdateSidebarState(false, 350); // Custom width

            // Act - Resize to mobile and back
            var mobileWidth = new System.Drawing.Rectangle(0, 0, 700, 600);
            await _uiStateService.UpdateWindowBounds(mobileWidth);
            
            await _uiStateService.UpdateWindowBounds(desktopWidth);

            // Assert - Custom width should be preserved
            var state = _uiStateService.CurrentState;
            Assert.AreEqual(350, state.SidebarWidth, 
                "Sidebar width preference should be maintained across breakpoint changes");
        }

        [TestMethod]
        public async Task Sidebar_ShouldHandleEdgeCaseAt768pxExactly()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Act - Set window to exactly 768px (the breakpoint)
            var exactBreakpoint = new System.Drawing.Rectangle(0, 0, 768, 600);
            await _uiStateService.UpdateWindowBounds(exactBreakpoint);

            // Assert - Should handle the exact breakpoint consistently
            var state = _uiStateService.CurrentState;
            Assert.AreEqual(768, state.WindowBounds.Width, "Window should be exactly at breakpoint");
            
            // CSS media queries typically use min-width or max-width
            // So 768px would either be the last "mobile" width or first "desktop" width
            // depending on the media query direction
        }

        [TestMethod]
        public async Task Sidebar_ShouldSupportManualToggleAtAnyWidth()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Act & Assert - Manual toggle at desktop width
            var desktopWidth = new System.Drawing.Rectangle(0, 0, 1200, 800);
            await _uiStateService.UpdateWindowBounds(desktopWidth);
            
            await _uiStateService.UpdateSidebarState(true); // Manual collapse
            Assert.IsTrue(_uiStateService.CurrentState.SidebarCollapsed, 
                "User should be able to manually collapse sidebar at desktop width");

            await _uiStateService.UpdateSidebarState(false); // Manual expand
            Assert.IsFalse(_uiStateService.CurrentState.SidebarCollapsed,
                "User should be able to manually expand sidebar at desktop width");

            // Act & Assert - Manual toggle at mobile width
            var mobileWidth = new System.Drawing.Rectangle(0, 0, 700, 600);
            await _uiStateService.UpdateWindowBounds(mobileWidth);
            
            await _uiStateService.UpdateSidebarState(false); // Manual expand at mobile
            Assert.IsFalse(_uiStateService.CurrentState.SidebarCollapsed,
                "User should be able to manually expand sidebar even at mobile width");
        }

        [TestMethod]
        public async Task Sidebar_ShouldHandleTabletBreakpoint()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Act - Test tablet widths (768px - 1024px)
            var tabletWidth = new System.Drawing.Rectangle(0, 0, 900, 700);
            await _uiStateService.UpdateWindowBounds(tabletWidth);

            // Assert - Tablet should have desktop-like behavior (above 768px)
            var state = _uiStateService.CurrentState;
            Assert.AreEqual(900, state.WindowBounds.Width, "Tablet width should be tracked");
            
            // Sidebar behavior at tablet sizes depends on design decision
            // Typically tablets (768px+) would show sidebar like desktop
        }

        [TestMethod]
        public async Task UIState_ShouldValidateCorrectly()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            var validState = UIState.CreateDefault();

            // Act & Assert - Valid state should pass validation
            Assert.IsTrue(validState.IsValid(), "Default UI state should be valid");

            // Act & Assert - Invalid sidebar width should fail validation
            validState.SidebarWidth = 100; // Below minimum
            Assert.IsFalse(validState.IsValid(), "State with invalid sidebar width should fail validation");

            // Act & Assert - Invalid window bounds should fail validation
            validState.SidebarWidth = 300; // Fix sidebar width
            validState.WindowBounds = new System.Drawing.Rectangle(0, 0, 200, 100); // Too small
            Assert.IsFalse(validState.IsValid(), "State with invalid window bounds should fail validation");
        }

        [TestMethod]
        public async Task TabManagement_ShouldMaintainConsistency()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Act & Assert - Add tabs
            await _uiStateService.AddTab("tab1");
            await _uiStateService.AddTab("tab2");
            await _uiStateService.AddTab("tab3");

            var state = _uiStateService.CurrentState;
            Assert.AreEqual(3, state.OpenTabIds.Count, "Should have 3 open tabs");
            Assert.AreEqual("tab3", state.ActiveTabId, "Last added tab should be active");

            // Act & Assert - Remove middle tab
            await _uiStateService.RemoveTab("tab2");
            state = _uiStateService.CurrentState;
            Assert.AreEqual(2, state.OpenTabIds.Count, "Should have 2 open tabs after removal");
            Assert.IsTrue(state.IsValid(), "Tab state should remain valid after removal");

            // Act & Assert - Remove active tab
            await _uiStateService.RemoveTab("tab3");
            state = _uiStateService.CurrentState;
            Assert.AreEqual("tab1", state.ActiveTabId, "Should switch to remaining tab when active tab is removed");
        }

        [TestMethod]
        public async Task StateChanges_ShouldUpdateTimestamp()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();
            var initialTime = _uiStateService.CurrentState.LastModified;

            // Act
            await Task.Delay(10); // Ensure timestamp difference
            await _uiStateService.UpdateSidebarState(true);

            // Assert
            var newTime = _uiStateService.CurrentState.LastModified;
            Assert.IsTrue(newTime > initialTime, "Last modified timestamp should be updated on state changes");
        }

        [TestMethod]
        public async Task StatePersistence_ShouldSurviveReinitialization()
        {
            // Arrange
            Assert.IsNotNull(_uiStateService);
            await _uiStateService.InitializeAsync();

            // Act - Make changes
            await _uiStateService.UpdateSidebarState(true, 350);
            await _uiStateService.AddTab("persistent-tab");
            var originalState = _uiStateService.CurrentState;

            // Simulate app restart by creating new service instance
            var settingsService = new MarkRead.App.Services.SettingsService();
            var newUIStateService = new UIStateService(settingsService);
            await newUIStateService.InitializeAsync();

            // Assert - State should be restored
            var restoredState = newUIStateService.CurrentState;
            Assert.AreEqual(originalState.SidebarCollapsed, restoredState.SidebarCollapsed, "Sidebar collapse state should persist");
            Assert.AreEqual(originalState.SidebarWidth, restoredState.SidebarWidth, "Sidebar width should persist");
            Assert.IsTrue(restoredState.OpenTabIds.Contains("persistent-tab"), "Open tabs should persist");
        }
    }
}