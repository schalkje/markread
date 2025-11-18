using System.Collections.Generic;
using System.Linq;

namespace MarkRead.App.Services;

/// <summary>
/// Represents a single folder exclusion rule for the sidebar tree view.
/// </summary>
public class ExclusionRule
{
    /// <summary>
    /// The folder name pattern to exclude (case-insensitive).
    /// </summary>
    public string Pattern { get; set; } = string.Empty;

    /// <summary>
    /// Whether this exclusion rule is currently active.
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Whether this is a built-in rule (cannot be deleted, only disabled).
    /// </summary>
    public bool IsBuiltIn { get; set; }

    /// <summary>
    /// Optional description of what this exclusion rule is for.
    /// </summary>
    public string? Description { get; set; }

    public ExclusionRule()
    {
    }

    public ExclusionRule(string pattern, bool isBuiltIn = false, string? description = null)
    {
        Pattern = pattern;
        IsBuiltIn = isBuiltIn;
        IsEnabled = true;
        Description = description;
    }
}

/// <summary>
/// Container for folder exclusion settings with default built-in rules.
/// </summary>
public class FolderExclusionSettings
{
    /// <summary>
    /// List of all exclusion rules (built-in and custom).
    /// </summary>
    public List<ExclusionRule> ExclusionRules { get; set; } = new();

    /// <summary>
    /// Creates default settings with built-in exclusion rules.
    /// </summary>
    public static FolderExclusionSettings CreateDefault()
    {
        return new FolderExclusionSettings
        {
            ExclusionRules = new List<ExclusionRule>
            {
                new(".venv", isBuiltIn: true, description: "Python virtual environment"),
                new(".env", isBuiltIn: true, description: "Environment configuration folder"),
                new("venv", isBuiltIn: true, description: "Python virtual environment"),
                new("bin", isBuiltIn: true, description: "Binary output folder"),
                new("obj", isBuiltIn: true, description: "Object files and intermediate build output"),
                new("node_modules", isBuiltIn: true, description: "Node.js dependencies")
            }
        };
    }

    /// <summary>
    /// Gets all enabled exclusion patterns.
    /// </summary>
    public IEnumerable<string> GetEnabledPatterns()
    {
        return ExclusionRules
            .Where(r => r.IsEnabled)
            .Select(r => r.Pattern);
    }

    /// <summary>
    /// Checks if a folder name matches any enabled exclusion rule.
    /// </summary>
    public bool IsExcluded(string folderName)
    {
        if (string.IsNullOrEmpty(folderName))
            return false;

        return ExclusionRules
            .Where(r => r.IsEnabled)
            .Any(r => string.Equals(r.Pattern, folderName, System.StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Adds a new custom exclusion rule if it doesn't already exist.
    /// </summary>
    public bool AddCustomRule(string pattern, string? description = null)
    {
        if (string.IsNullOrWhiteSpace(pattern))
            return false;

        // Check if pattern already exists (case-insensitive)
        if (ExclusionRules.Any(r => string.Equals(r.Pattern, pattern, System.StringComparison.OrdinalIgnoreCase)))
            return false;

        ExclusionRules.Add(new ExclusionRule(pattern, isBuiltIn: false, description: description));
        return true;
    }

    /// <summary>
    /// Removes a custom exclusion rule (built-in rules cannot be removed).
    /// </summary>
    public bool RemoveCustomRule(string pattern)
    {
        var rule = ExclusionRules.FirstOrDefault(r => 
            !r.IsBuiltIn && 
            string.Equals(r.Pattern, pattern, System.StringComparison.OrdinalIgnoreCase));

        if (rule != null)
        {
            ExclusionRules.Remove(rule);
            return true;
        }

        return false;
    }

    /// <summary>
    /// Resets all rules to factory defaults.
    /// </summary>
    public void ResetToDefaults()
    {
        ExclusionRules.Clear();
        var defaults = CreateDefault();
        ExclusionRules.AddRange(defaults.ExclusionRules);
    }
}
