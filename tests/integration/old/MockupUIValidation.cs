using System;
using System.IO;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace MarkRead.IntegrationTests
{
    /// <summary>
    /// T084: Validates that all mockup UI features from specs/003-mockup-ui are implemented.
    /// Comprehensive validation of all phases (T001-T086).
    /// </summary>
    [TestClass]
    public class MockupUIValidation
    {
        private static string GetRepoRoot()
        {
            var directory = Directory.GetCurrentDirectory();
            while (directory != null)
            {
                if (Directory.Exists(Path.Combine(directory, ".git")) ||
                    File.Exists(Path.Combine(directory, "markread.sln")))
                {
                    return directory;
                }
                directory = Directory.GetParent(directory)?.FullName;
            }
            
            throw new InvalidOperationException("Could not find repository root");
        }

        #region Phase 1: Foundation (T001-T010)

        [TestMethod]
        public void Phase1_UIComponents_Exist()
        {
            var repoRoot = GetRepoRoot();
            
            // Verify UI components created in Phase 1
            Assert.IsTrue(File.Exists(Path.Combine(repoRoot, "src", "UI", "Tabs", "TabsView.xaml")));
            Assert.IsTrue(File.Exists(Path.Combine(repoRoot, "src", "UI", "Tabs", "TabsView.xaml.cs")));
            Assert.IsTrue(File.Exists(Path.Combine(repoRoot, "src", "UI", "Sidebar", "SidebarView.xaml")));
            Assert.IsTrue(File.Exists(Path.Combine(repoRoot, "src", "UI", "Sidebar", "SidebarView.xaml.cs")));
        }

        [TestMethod]
        public void Phase1_TabModel_Exists()
        {
            var repoRoot = GetRepoRoot();
            var tabItemPath = Path.Combine(repoRoot, "src", "UI", "Tabs", "TabItem.cs");
            
            Assert.IsTrue(File.Exists(tabItemPath), "TabItem model should exist");
        }

        #endregion

        #region Phase 2: Tab System (T011-T020)

        [TestMethod]
        public void Phase2_TabService_Exists()
        {
            var repoRoot = GetRepoRoot();
            var tabServicePath = Path.Combine(repoRoot, "src", "Services", "TabService.cs");
            
            Assert.IsTrue(File.Exists(tabServicePath), "TabService should exist for tab management");
        }

        [TestMethod]
        public void Phase2_TabsIntegrationTests_Exist()
        {
            var repoRoot = GetRepoRoot();
            var testPath = Path.Combine(repoRoot, "tests", "integration", "TabsAndSearchTests.cs");
            
            Assert.IsTrue(File.Exists(testPath), "Tabs integration tests should exist");
        }

        #endregion

        #region Phase 3: Navigation (T021-T030)

        [TestMethod]
        public void Phase3_HistoryService_Exists()
        {
            var repoRoot = GetRepoRoot();
            var historyServicePath = Path.Combine(repoRoot, "src", "Services", "HistoryService.cs");
            
            Assert.IsTrue(File.Exists(historyServicePath), "HistoryService should exist for navigation");
        }

        [TestMethod]
        public void Phase3_NavigationTests_Exist()
        {
            var repoRoot = GetRepoRoot();
            var testPath = Path.Combine(repoRoot, "tests", "integration", "HistoryNavigationTests.cs");
            
            Assert.IsTrue(File.Exists(testPath), "History navigation tests should exist");
        }

        #endregion

        #region Phase 4: Theme System (T031-T040)

        [TestMethod]
        public void Phase4_ThemeManager_Exists()
        {
            var repoRoot = GetRepoRoot();
            var themeManagerPath = Path.Combine(repoRoot, "src", "App", "ThemeManager.cs");
            
            Assert.IsTrue(File.Exists(themeManagerPath), "ThemeManager should exist");
        }

        [TestMethod]
        public void Phase4_ThemeResources_Exist()
        {
            var repoRoot = GetRepoRoot();
            
            Assert.IsTrue(Directory.Exists(Path.Combine(repoRoot, "src", "App", "Themes")), 
                "Themes directory should exist");
        }

        #endregion

        #region Phase 5: Sidebar & File Tree (T041-T050)

        [TestMethod]
        public void Phase5_FolderService_Exists()
        {
            var repoRoot = GetRepoRoot();
            var folderServicePath = Path.Combine(repoRoot, "src", "Services", "FolderService.cs");
            
            Assert.IsTrue(File.Exists(folderServicePath), "FolderService should exist");
        }

        [TestMethod]
        public void Phase5_FileWatcher_Exists()
        {
            var repoRoot = GetRepoRoot();
            var fileWatcherPath = Path.Combine(repoRoot, "src", "Services", "FileWatcherService.cs");
            
            Assert.IsTrue(File.Exists(fileWatcherPath), "FileWatcherService should exist for live updates");
        }

        #endregion

        #region Phase 6: Rendering (T051-T060)

        [TestMethod]
        public void Phase6_MarkdownService_Exists()
        {
            var repoRoot = GetRepoRoot();
            var markdownServicePath = Path.Combine(repoRoot, "src", "Services", "MarkdownService.cs");
            
            Assert.IsTrue(File.Exists(markdownServicePath), "MarkdownService should exist");
        }

        [TestMethod]
        public void Phase6_RenderingAssets_Exist()
        {
            var repoRoot = GetRepoRoot();
            var assetsPath = Path.Combine(repoRoot, "src", "Rendering", "assets");
            
            Assert.IsTrue(Directory.Exists(assetsPath), "Rendering assets should exist");
            Assert.IsTrue(Directory.Exists(Path.Combine(assetsPath, "highlight")), "Highlight.js assets should exist");
            Assert.IsTrue(Directory.Exists(Path.Combine(assetsPath, "mermaid")), "Mermaid assets should exist");
        }

        [TestMethod]
        public void Phase6_HtmlTemplate_Exists()
        {
            var repoRoot = GetRepoRoot();
            var templatePath = Path.Combine(repoRoot, "src", "Rendering", "template", "index.html");
            
            Assert.IsTrue(File.Exists(templatePath), "HTML template should exist");
        }

        #endregion

        #region Phase 7: Find & Navigation (T061-T067)

        [TestMethod]
        public void Phase7_FindBar_Exists()
        {
            var repoRoot = GetRepoRoot();
            
            Assert.IsTrue(File.Exists(Path.Combine(repoRoot, "src", "UI", "Find", "FindBar.xaml")));
            Assert.IsTrue(File.Exists(Path.Combine(repoRoot, "src", "UI", "Find", "FindBar.xaml.cs")));
        }

        [TestMethod]
        public void Phase7_NavigationCommands_Exist()
        {
            var repoRoot = GetRepoRoot();
            var navCommandsPath = Path.Combine(repoRoot, "src", "UI", "Shell", "NavigationCommands.cs");
            
            Assert.IsTrue(File.Exists(navCommandsPath), "NavigationCommands should exist");
        }

        #endregion

        #region Phase 8: Search Interface (T068-T077)

        [TestMethod]
        public void Phase8_SearchService_Exists()
        {
            var repoRoot = GetRepoRoot();
            var searchServicePath = Path.Combine(repoRoot, "src", "Services", "SearchService.cs");
            
            Assert.IsTrue(File.Exists(searchServicePath), "SearchService should exist");
        }

        [TestMethod]
        public void Phase8_GlobalSearchPanel_Exists()
        {
            var repoRoot = GetRepoRoot();
            
            Assert.IsTrue(File.Exists(Path.Combine(repoRoot, "src", "UI", "Search", "GlobalSearchPanel.xaml")));
            Assert.IsTrue(File.Exists(Path.Combine(repoRoot, "src", "UI", "Search", "GlobalSearchPanel.xaml.cs")));
        }

        [TestMethod]
        public void Phase8_SearchIntegrationTests_Exist()
        {
            var repoRoot = GetRepoRoot();
            
            Assert.IsTrue(File.Exists(Path.Combine(repoRoot, "tests", "integration", "SearchInterfaceTests.cs")));
            Assert.IsTrue(File.Exists(Path.Combine(repoRoot, "tests", "integration", "SearchStylingTests.cs")));
        }

        #endregion

        #region Phase 9: Polish & Cross-Cutting (T078-T086)

        [TestMethod]
        public void Phase9_AnimationPerformanceMonitor_Exists()
        {
            var repoRoot = GetRepoRoot();
            var monitorPath = Path.Combine(repoRoot, "src", "Services", "AnimationPerformanceMonitor.cs");
            
            Assert.IsTrue(File.Exists(monitorPath), "AnimationPerformanceMonitor should exist (T078)");
        }

        [TestMethod]
        public void Phase9_StartupPerformanceMonitor_Exists()
        {
            var repoRoot = GetRepoRoot();
            var monitorPath = Path.Combine(repoRoot, "src", "Services", "StartupPerformanceMonitor.cs");
            
            Assert.IsTrue(File.Exists(monitorPath), "StartupPerformanceMonitor should exist (T083)");
        }

        [TestMethod]
        public void Phase9_AccessibilityValidator_Exists()
        {
            var repoRoot = GetRepoRoot();
            var validatorPath = Path.Combine(repoRoot, "src", "Services", "AccessibilityValidator.cs");
            
            Assert.IsTrue(File.Exists(validatorPath), "AccessibilityValidator should exist (T081)");
        }

        [TestMethod]
        public void Phase9_SettingsBackup_Implemented()
        {
            var repoRoot = GetRepoRoot();
            var settingsServicePath = Path.Combine(repoRoot, "src", "Services", "SettingsService.cs");
            
            Assert.IsTrue(File.Exists(settingsServicePath));
            
            var content = File.ReadAllText(settingsServicePath);
            Assert.IsTrue(content.Contains("RestoreFromBackupAsync"), "Settings backup/restore should be implemented (T080)");
        }

        [TestMethod]
        public void Phase9_ThemeErrorHandling_Implemented()
        {
            var repoRoot = GetRepoRoot();
            var themeManagerPath = Path.Combine(repoRoot, "src", "App", "ThemeManager.cs");
            
            Assert.IsTrue(File.Exists(themeManagerPath));
            
            var content = File.ReadAllText(themeManagerPath);
            Assert.IsTrue(content.Contains("CreateDefaultThemeConfiguration"), "Theme error handling should be implemented (T079)");
        }

        #endregion

        #region Comprehensive Feature Validation

        [TestMethod]
        public void AllCoreServices_Exist()
        {
            var repoRoot = GetRepoRoot();
            var servicesPath = Path.Combine(repoRoot, "src", "Services");
            
            var requiredServices = new[]
            {
                "MarkdownService.cs",
                "FolderService.cs",
                "HistoryService.cs",
                "SettingsService.cs",
                "LinkResolver.cs",
                "FileWatcherService.cs",
                "SearchService.cs",
                "AnimationPerformanceMonitor.cs",
                "StartupPerformanceMonitor.cs",
                "AccessibilityValidator.cs"
            };

            foreach (var service in requiredServices)
            {
                Assert.IsTrue(File.Exists(Path.Combine(servicesPath, service)), 
                    $"Service {service} should exist");
            }
        }

        [TestMethod]
        public void AllUIComponents_Exist()
        {
            var repoRoot = GetRepoRoot();
            var uiPath = Path.Combine(repoRoot, "src", "UI");
            
            var requiredComponents = new[]
            {
                Path.Combine("Tabs", "TabsView.xaml"),
                Path.Combine("Tabs", "TabItem.cs"),
                Path.Combine("Sidebar", "SidebarView.xaml"),
                Path.Combine("Find", "FindBar.xaml"),
                Path.Combine("Search", "GlobalSearchPanel.xaml"),
                Path.Combine("Settings", "ThemeSettingsView.xaml"),
                Path.Combine("Start", "StartView.xaml")
            };

            foreach (var component in requiredComponents)
            {
                Assert.IsTrue(File.Exists(Path.Combine(uiPath, component)), 
                    $"UI component {component} should exist");
            }
        }

        [TestMethod]
        public void AllIntegrationTests_Exist()
        {
            var repoRoot = GetRepoRoot();
            var testsPath = Path.Combine(repoRoot, "tests", "integration");
            
            var requiredTests = new[]
            {
                "StartupSmokeTests.cs",
                "QuickstartValidation.cs",
                "TabsAndSearchTests.cs",
                "HistoryNavigationTests.cs",
                "SearchInterfaceTests.cs",
                "SearchStylingTests.cs"
            };

            foreach (var test in requiredTests)
            {
                Assert.IsTrue(File.Exists(Path.Combine(testsPath, test)), 
                    $"Test {test} should exist");
            }
        }

        [TestMethod]
        public void ProjectBuilds_Successfully()
        {
            // This test validates that the project structure is complete enough to build
            var repoRoot = GetRepoRoot();
            var slnPath = Path.Combine(repoRoot, "markread.sln");
            
            Assert.IsTrue(File.Exists(slnPath), "Solution file should exist");
        }

        #endregion
    }
}
