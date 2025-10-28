using System;
using System.IO;
using System.Threading.Tasks;
using Xunit;

namespace MarkRead.IntegrationTests;

/// <summary>
/// Validates quickstart scenarios and developer onboarding requirements.
/// This ensures the documented quickstart path works correctly.
/// </summary>
public class QuickstartValidation
{
    [Fact]
    public void Quickstart_Prerequisites_Documented()
    {
        // Verify quickstart.md exists and is readable
        var quickstartPath = Path.Combine(GetRepoRoot(), "specs", "001-markdown-viewer", "quickstart.md");
        Assert.True(File.Exists(quickstartPath), "quickstart.md should exist");

        var content = File.ReadAllText(quickstartPath);
        
        // Verify essential sections are present
        Assert.Contains("Prerequisites", content);
        Assert.Contains(".NET SDK 8.0", content);
        Assert.Contains("WebView2", content);
        Assert.Contains("Build and Run", content);
    }

    [Fact]
    public void Quickstart_ProjectStructure_Exists()
    {
        var repoRoot = GetRepoRoot();
        
        // Verify main source directories exist
        Assert.True(Directory.Exists(Path.Combine(repoRoot, "src", "App")), "src/App should exist");
        Assert.True(Directory.Exists(Path.Combine(repoRoot, "src", "Rendering")), "src/Rendering should exist");
        Assert.True(Directory.Exists(Path.Combine(repoRoot, "src", "Services")), "src/Services should exist");
        Assert.True(Directory.Exists(Path.Combine(repoRoot, "src", "UI")), "src/UI should exist");
        Assert.True(Directory.Exists(Path.Combine(repoRoot, "src", "Cli")), "src/Cli should exist");
    }

    [Fact]
    public void Quickstart_TestDirectories_Exist()
    {
        var repoRoot = GetRepoRoot();
        
        // Verify test directories exist
        Assert.True(Directory.Exists(Path.Combine(repoRoot, "tests", "integration")), "tests/integration should exist");
        Assert.True(Directory.Exists(Path.Combine(repoRoot, "tests", "unit")), "tests/unit should exist");
    }

    [Fact]
    public void Quickstart_SpecificationDocuments_Exist()
    {
        var repoRoot = GetRepoRoot();
        var specDir = Path.Combine(repoRoot, "specs", "001-markdown-viewer");
        
        // Verify specification artifacts exist
        Assert.True(File.Exists(Path.Combine(specDir, "spec.md")), "spec.md should exist");
        Assert.True(File.Exists(Path.Combine(specDir, "plan.md")), "plan.md should exist");
        Assert.True(File.Exists(Path.Combine(specDir, "quickstart.md")), "quickstart.md should exist");
        Assert.True(File.Exists(Path.Combine(specDir, "tasks.md")), "tasks.md should exist");
    }

    [Fact]
    public void Quickstart_AssetDirectories_Exist()
    {
        var repoRoot = GetRepoRoot();
        var renderingPath = Path.Combine(repoRoot, "src", "Rendering");
        
        // Verify rendering assets structure exists
        Assert.True(Directory.Exists(Path.Combine(renderingPath, "assets")), "Rendering/assets should exist");
        Assert.True(Directory.Exists(Path.Combine(renderingPath, "template")), "Rendering/template should exist");
    }

    [Fact]
    public void Quickstart_CLIStartup_Supports_NoArguments()
    {
        // Verify that CLI can handle no arguments (should show folder picker or start screen)
        var args = Array.Empty<string>();
        var startupArgs = Cli.StartupArguments.Parse(args);
        
        Assert.False(startupArgs.HasArgument, "No arguments should result in HasArgument = false");
        Assert.Equal(Cli.StartupPathKind.None, startupArgs.PathKind);
    }

    [Fact]
    public void Quickstart_CLIStartup_Supports_FolderArgument()
    {
        // Verify that CLI can parse a folder argument
        var tempDir = Path.GetTempPath();
        var args = new[] { tempDir };
        var startupArgs = Cli.StartupArguments.Parse(args);
        
        Assert.True(startupArgs.HasArgument, "Folder argument should be recognized");
        Assert.Equal(Cli.StartupPathKind.Directory, startupArgs.PathKind);
    }

    [Fact]
    public void Quickstart_CLIStartup_Supports_FileArgument()
    {
        // Create a temporary markdown file
        var tempFile = Path.Combine(Path.GetTempPath(), $"test_{Guid.NewGuid()}.md");
        try
        {
            File.WriteAllText(tempFile, "# Test");
            
            var args = new[] { tempFile };
            var startupArgs = Cli.StartupArguments.Parse(args);
            
            Assert.True(startupArgs.HasArgument, "File argument should be recognized");
            Assert.Equal(Cli.StartupPathKind.File, startupArgs.PathKind);
            Assert.Equal(Path.GetDirectoryName(tempFile), startupArgs.RootCandidate);
        }
        finally
        {
            if (File.Exists(tempFile))
            {
                File.Delete(tempFile);
            }
        }
    }

    [Fact]
    public void Quickstart_Settings_Persistence_Available()
    {
        var repoRoot = GetRepoRoot();
        var settingsServicePath = Path.Combine(repoRoot, "src", "Services", "SettingsService.cs");
        
        Assert.True(File.Exists(settingsServicePath), "SettingsService should exist for settings persistence");
    }

    [Fact]
    public void Quickstart_ThemeManager_Available()
    {
        var repoRoot = GetRepoRoot();
        var themeManagerPath = Path.Combine(repoRoot, "src", "App", "ThemeManager.cs");
        
        Assert.True(File.Exists(themeManagerPath), "ThemeManager should exist for theme switching");
    }

    [Fact]
    public void Quickstart_WebView2_Integration_Available()
    {
        var repoRoot = GetRepoRoot();
        var webViewHostPath = Path.Combine(repoRoot, "src", "Rendering", "WebViewHost.cs");
        
        Assert.True(File.Exists(webViewHostPath), "WebViewHost should exist for WebView2 integration");
    }

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
}
