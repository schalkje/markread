using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Service for file system operations
/// </summary>
public interface IFileSystemService
{
    /// <summary>
    /// Reads a file's content
    /// </summary>
    Task<string> ReadFileAsync(string filePath);

    /// <summary>
    /// Loads a directory structure
    /// </summary>
    Task<FileTreeNode> LoadDirectoryAsync(string path);

    /// <summary>
    /// Watches a file for changes
    /// </summary>
    IDisposable WatchFile(string filePath, Action<string> onChanged);

    /// <summary>
    /// Checks if a file exists
    /// </summary>
    bool FileExists(string filePath);

    /// <summary>
    /// Gets file modification time
    /// </summary>
    DateTime GetFileModifiedTime(string filePath);
}
