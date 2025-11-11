using System;
using System.IO;

namespace MarkRead.App.Services;

public sealed class FolderService
{
    public FolderValidationResult ValidateRootCandidate(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return FolderValidationResult.Invalid("Path was empty or whitespace.");
        }

        string normalized;
        try
        {
            normalized = Path.GetFullPath(path);
        }
        catch (Exception ex)
        {
            return FolderValidationResult.Invalid($"Unable to resolve path: {ex.Message}");
        }

        if (!Directory.Exists(normalized))
        {
            return FolderValidationResult.Invalid("Directory does not exist.");
        }

        if (!HasReadAccess(normalized))
        {
            return FolderValidationResult.Invalid("Directory is not accessible.");
        }

        var displayName = new DirectoryInfo(normalized).Name;
        if (string.IsNullOrEmpty(displayName))
        {
            displayName = normalized;
        }

        return FolderValidationResult.Valid(normalized, displayName);
    }

    public bool IsWithinRoot(string rootPath, string candidatePath)
    {
        if (string.IsNullOrWhiteSpace(rootPath) || string.IsNullOrWhiteSpace(candidatePath))
        {
            return false;
        }

        try
        {
            var rootFull = EnsureTrailingSeparator(Path.GetFullPath(rootPath));
            var candidateFull = Path.GetFullPath(candidatePath);
            return candidateFull.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception)
        {
            return false;
        }
    }

    public FolderRoot CreateRoot(string path)
    {
        var validation = ValidateRootCandidate(path);
        if (!validation.IsValid || validation.NormalizedPath is null)
        {
            throw new InvalidOperationException(validation.Error ?? "Unable to create folder root.");
        }

        return new FolderRoot(validation.NormalizedPath, validation.DisplayName ?? Path.GetFileName(validation.NormalizedPath), DateTimeOffset.UtcNow);
    }

    /// <summary>
    /// Quickly checks if the root folder contains any markdown files (in root or subdirectories).
    /// This is a fast check that returns as soon as the first file is found.
    /// </summary>
    public bool HasAnyMarkdownFiles(FolderRoot root)
    {
        try
        {
            // Check for any .md, .markdown, or .mdx files recursively
            var extensions = new[] { "*.md", "*.markdown", "*.mdx" };
            foreach (var extension in extensions)
            {
                var firstFile = Directory.EnumerateFiles(root.Path, extension, SearchOption.AllDirectories)
                    .FirstOrDefault();
                if (firstFile != null)
                {
                    return true;
                }
            }
            return false;
        }
        catch
        {
            // If we can't access the directory, assume no files
            return false;
        }
    }

    public DocumentInfo? ResolveDefaultDocument(FolderRoot root)
    {
        var candidates = new[]
        {
            "README.md",
            "Readme.md",
            "readme.md",
            "README.markdown",
            "README.mdx"
        };

        foreach (var candidate in candidates)
        {
            var path = Path.Combine(root.Path, candidate);
            if (File.Exists(path))
            {
                return CreateDocument(root, path);
            }
        }

        foreach (var file in Directory.EnumerateFiles(root.Path, "*.md", SearchOption.TopDirectoryOnly))
        {
            return CreateDocument(root, file);
        }

        return null;
    }

    public DocumentInfo? TryResolveDocument(FolderRoot root, string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return null;
        }

        string fullPath;
        try
        {
            fullPath = Path.GetFullPath(path);
        }
        catch
        {
            return null;
        }

        if (!IsWithinRoot(root.Path, fullPath) || !File.Exists(fullPath))
        {
            return null;
        }

        return CreateDocument(root, fullPath);
    }

    private static bool HasReadAccess(string path)
    {
        try
        {
            using var enumerator = Directory.EnumerateFileSystemEntries(path).GetEnumerator();
            _ = enumerator.MoveNext();
            return true;
        }
        catch (UnauthorizedAccessException)
        {
            return false;
        }
        catch (DirectoryNotFoundException)
        {
            return false;
        }
        catch (IOException)
        {
            return false;
        }
    }

    private static string EnsureTrailingSeparator(string path)
    {
        if (path.EndsWith(Path.DirectorySeparatorChar) || path.EndsWith(Path.AltDirectorySeparatorChar))
        {
            return path;
        }

        return path + Path.DirectorySeparatorChar;
    }

    private static DocumentInfo CreateDocument(FolderRoot root, string fullPath)
    {
        var relative = Path.GetRelativePath(root.Path, fullPath);
        var fileInfo = new FileInfo(fullPath);
        return new DocumentInfo(fullPath,
            relative,
            fileInfo.Length,
            fileInfo.LastWriteTimeUtc);
    }
}

public sealed record FolderRoot(string Path, string DisplayName, DateTimeOffset LastOpenedAt);

public readonly struct FolderValidationResult
{
    private FolderValidationResult(bool isValid, string? normalizedPath, string? displayName, string? error)
    {
        IsValid = isValid;
        NormalizedPath = normalizedPath;
        DisplayName = displayName;
        Error = error;
    }

    public bool IsValid { get; }

    public string? NormalizedPath { get; }

    public string? DisplayName { get; }

    public string? Error { get; }

    public static FolderValidationResult Valid(string normalizedPath, string? displayName) => new(true, normalizedPath, displayName, null);

    public static FolderValidationResult Invalid(string error) => new(false, null, null, error);
}

public readonly record struct DocumentInfo(
    string FullPath,
    string RelativePath,
    long SizeBytes,
    DateTime LastModifiedUtc);
