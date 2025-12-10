using System.Text.RegularExpressions;

namespace MarkRead.Platforms.Windows;

/// <summary>
/// Parser for command-line arguments on Windows platform
/// </summary>
public class StartupArguments
{
    /// <summary>
    /// File path to open (if provided)
    /// </summary>
    public string? FilePath { get; set; }

    /// <summary>
    /// Folder path to open (if provided)
    /// </summary>
    public string? FolderPath { get; set; }

    /// <summary>
    /// Whether to open in a new window
    /// </summary>
    public bool NewWindow { get; set; }

    /// <summary>
    /// Environment variables passed via command line
    /// </summary>
    public Dictionary<string, string> EnvironmentVariables { get; } = new();

    /// <summary>
    /// Parses command-line arguments
    /// </summary>
    public static StartupArguments Parse(string[] args)
    {
        var result = new StartupArguments();

        for (int i = 0; i < args.Length; i++)
        {
            var arg = args[i];

            // Handle flags
            if (arg == "--new-window" || arg == "-n")
            {
                result.NewWindow = true;
                continue;
            }

            // Handle environment variables (format: KEY=VALUE)
            if (arg.Contains('='))
            {
                var parts = arg.Split('=', 2);
                if (parts.Length == 2 && IsValidEnvironmentVariableName(parts[0]))
                {
                    result.EnvironmentVariables[parts[0]] = parts[1];
                    continue;
                }
            }

            // Handle file/folder paths
            if (File.Exists(arg))
            {
                // It's a file
                result.FilePath = Path.GetFullPath(arg);
            }
            else if (Directory.Exists(arg))
            {
                // It's a folder
                result.FolderPath = Path.GetFullPath(arg);
            }
            else if (i == args.Length - 1)
            {
                // Last argument might be a path that doesn't exist yet
                // Try to determine if it's meant to be a file or folder
                var normalized = Path.GetFullPath(arg);
                if (Path.HasExtension(normalized))
                {
                    result.FilePath = normalized;
                }
                else
                {
                    result.FolderPath = normalized;
                }
            }
        }

        return result;
    }

    /// <summary>
    /// Validates environment variable name (alphanumeric and underscore only)
    /// </summary>
    private static bool IsValidEnvironmentVariableName(string name)
    {
        return !string.IsNullOrWhiteSpace(name) && 
               Regex.IsMatch(name, @"^[A-Za-z_][A-Za-z0-9_]*$");
    }

    /// <summary>
    /// Returns true if any startup path (file or folder) is specified
    /// </summary>
    public bool HasPath => !string.IsNullOrEmpty(FilePath) || !string.IsNullOrEmpty(FolderPath);

    /// <summary>
    /// Returns the primary path (file takes precedence over folder)
    /// </summary>
    public string? GetPrimaryPath()
    {
        return FilePath ?? FolderPath;
    }

    /// <summary>
    /// Returns true if the primary path is a file
    /// </summary>
    public bool IsFilePath => !string.IsNullOrEmpty(FilePath);

    /// <summary>
    /// Returns true if the primary path is a folder
    /// </summary>
    public bool IsFolderPath => string.IsNullOrEmpty(FilePath) && !string.IsNullOrEmpty(FolderPath);
}
