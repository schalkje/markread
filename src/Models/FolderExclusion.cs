namespace MarkRead.Models;

/// <summary>
/// Represents folder exclusion patterns for file tree filtering
/// </summary>
public class FolderExclusion
{
    /// <summary>
    /// Default folder patterns to exclude from the file tree
    /// </summary>
    public static readonly HashSet<string> DefaultExclusions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".git",
        "node_modules",
        "bin",
        "obj",
        ".vscode",
        ".vs",
        ".idea",
        "packages",
        ".env",
        "venv",
        "__pycache__",
        ".pytest_cache",
        "target",
        "build",
        "dist"
    };

    /// <summary>
    /// Gets or sets the exclusion patterns
    /// </summary>
    public HashSet<string> Patterns { get; set; } = new(DefaultExclusions, StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Checks if a folder should be excluded
    /// </summary>
    public bool ShouldExclude(string folderName)
    {
        return Patterns.Contains(folderName);
    }

    /// <summary>
    /// Checks if a file path is within an excluded folder
    /// </summary>
    public bool IsPathExcluded(string path)
    {
        var parts = path.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        return parts.Any(part => Patterns.Contains(part));
    }

    /// <summary>
    /// Adds an exclusion pattern
    /// </summary>
    public void AddPattern(string pattern)
    {
        Patterns.Add(pattern);
    }

    /// <summary>
    /// Removes an exclusion pattern
    /// </summary>
    public bool RemovePattern(string pattern)
    {
        return Patterns.Remove(pattern);
    }

    /// <summary>
    /// Clears all patterns
    /// </summary>
    public void Clear()
    {
        Patterns.Clear();
    }

    /// <summary>
    /// Resets to default exclusions
    /// </summary>
    public void ResetToDefaults()
    {
        Patterns.Clear();
        foreach (var pattern in DefaultExclusions)
        {
            Patterns.Add(pattern);
        }
    }
}
