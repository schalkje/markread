using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MarkRead.Models;
using MarkRead.Services;
using System.Collections.Concurrent;

namespace MarkRead.ViewModels;

/// <summary>
/// ViewModel for document viewing and management
/// </summary>
public partial class DocumentViewModel : ObservableObject
{
    private readonly IMarkdownService _markdownService;
    private readonly IFileSystemService _fileSystemService;
    private readonly ILoggingService _loggingService;
    
    // HTML cache to avoid re-rendering unchanged content (Performance: T055)
    private readonly ConcurrentDictionary<string, (string Html, string Hash)> _htmlCache = new();
    private const int MaxCacheSize = 50;

    [ObservableProperty]
    private Document? _currentDocument;

    [ObservableProperty]
    private string _title = "Untitled";

    [ObservableProperty]
    private string _content = string.Empty;

    [ObservableProperty]
    private double _scrollPosition;

    [ObservableProperty]
    private bool _isRendering;

    [ObservableProperty]
    private bool _hasError;

    [ObservableProperty]
    private string _errorMessage = string.Empty;

    [ObservableProperty]
    private bool _isLargeFile;

    [ObservableProperty]
    private string _performanceWarning = string.Empty;

    public DocumentViewModel(
        IMarkdownService markdownService,
        IFileSystemService fileSystemService,
        ILoggingService loggingService)
    {
        _markdownService = markdownService;
        _fileSystemService = fileSystemService;
        _loggingService = loggingService;
    }

    /// <summary>
    /// Loads a markdown document from the specified file path
    /// </summary>
    [RelayCommand]
    private async Task LoadDocumentAsync(string filePath)
    {
        var startTime = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            HasError = false;
            IsRendering = true;
            IsLargeFile = false;
            PerformanceWarning = string.Empty;

            // Read file content
            var content = await _fileSystemService.ReadFileAsync(filePath);
            
            // Performance: Check file size (T057)
            var fileSize = new System.IO.FileInfo(filePath).Length;
            if (fileSize > 10 * 1024 * 1024) // 10MB
            {
                IsLargeFile = true;
                PerformanceWarning = $"Large file detected ({fileSize / 1024 / 1024}MB). Rendering may take longer.";
                _loggingService.LogWarning($"Loading large file: {filePath} ({fileSize / 1024 / 1024}MB)");
            }
            
            // Get file info
            var fileName = Path.GetFileName(filePath);
            var lastModified = _fileSystemService.GetFileModifiedTime(filePath);

            // Calculate content hash for caching
            var contentHash = CalculateHash(content);

            // Check HTML cache (Performance: T055)
            string html;
            if (_htmlCache.TryGetValue(filePath, out var cached) && cached.Hash == contentHash)
            {
                html = cached.Html;
                _loggingService.LogInfo($"Using cached HTML for: {filePath}");
            }
            else
            {
                // Render markdown to HTML
                html = _markdownService.RenderToHtmlCached(content, contentHash);
                
                // Update cache
                _htmlCache[filePath] = (html, contentHash);
                
                // Limit cache size
                if (_htmlCache.Count > MaxCacheSize)
                {
                    var oldestKey = _htmlCache.Keys.First();
                    _htmlCache.TryRemove(oldestKey, out _);
                }
            }

            // Create document model
            var document = new Document
            {
                FilePath = filePath,
                Content = content,
                Title = fileName,
                LastModified = lastModified,
                ScrollPosition = 0,
                IsRendering = false,
                CachedHtml = html,
                ContentHash = contentHash
            };

            // Update view model
            CurrentDocument = document;
            Title = fileName;
            Content = content;
            ScrollPosition = document.ScrollPosition;

            startTime.Stop();
            _loggingService.LogInfo($"Loaded document: {filePath} in {startTime.ElapsedMilliseconds}ms");
            
            // Performance monitoring (T056)
            if (startTime.ElapsedMilliseconds > 1000)
            {
                _loggingService.LogWarning($"Slow document load: {filePath} took {startTime.ElapsedMilliseconds}ms");
            }
        }
        catch (Exception ex)
        {
            HasError = true;
            ErrorMessage = $"Failed to load document: {ex.Message}";
            _loggingService.LogError($"Error loading document {filePath}: {ex.Message}", ex);
        }
        finally
        {
            IsRendering = false;
        }
    }

    /// <summary>
    /// Updates the scroll position for the current document
    /// </summary>
    public void UpdateScrollPosition(double position)
    {
        ScrollPosition = position;
        if (CurrentDocument != null)
        {
            CurrentDocument.ScrollPosition = position;
        }
    }

    /// <summary>
    /// Reloads the current document (e.g., after file change)
    /// </summary>
    [RelayCommand]
    private async Task ReloadDocumentAsync()
    {
        if (CurrentDocument?.FilePath != null)
        {
            await LoadDocumentAsync(CurrentDocument.FilePath);
        }
    }

    /// <summary>
    /// Calculates a simple hash for content caching
    /// </summary>
    private string CalculateHash(string content)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}
