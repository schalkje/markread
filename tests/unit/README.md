# Unit Tests

## Status

Currently contains only placeholder tests. The original test suite was removed as it was outdated and incompatible with the current API.

## TODO

Implement comprehensive unit tests for:

- **SettingsService** (`MarkRead.App.Services`)
  - Settings persistence and loading
  - Theme configuration management
  - UI state management
  - Animation settings
  - TreeView settings

- **ThemeManager** (`MarkRead.App`)
  - Theme initialization
  - Theme switching (Light, Dark, System, High Contrast)
  - Color scheme customization
  - Event handling (ThemeChanged, ThemeLoadFailed)

- **LinkResolver** (`MarkRead.App.Services`)
  - Relative path resolution
  - Root-absolute path resolution
  - Cross-document linking

- **FolderService** (`MarkRead.App.Services`)
  - Folder validation
  - Root candidate validation
  - Markdown file discovery

## Test Framework

The project uses:
- **xUnit** for tests using `[Fact]` attributes
- **MSTest** for tests using `[TestMethod]` attributes (if needed)

Both frameworks are supported in the project configuration.

## Running Tests

```powershell
# Restore dependencies
dotnet restore tests\unit\MarkRead.UnitTests.csproj

# Build tests
dotnet build tests\unit\MarkRead.UnitTests.csproj --configuration Release

# Run tests
dotnet test tests\unit\MarkRead.UnitTests.csproj --configuration Release --no-build
```
