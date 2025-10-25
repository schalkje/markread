using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace MarkRead.App.Services;

public sealed class HistoryService
{
    private readonly ConcurrentDictionary<Guid, NavigationHistory> _histories = new();

    public NavigationHistory GetOrCreate(Guid tabId)
    {
        return _histories.GetOrAdd(tabId, _ => new NavigationHistory());
    }

    public void Clear(Guid tabId)
    {
        _histories.TryRemove(tabId, out _);
    }

    public void ClearAll()
    {
        _histories.Clear();
    }
}

public sealed class NavigationHistory
{
    private readonly List<NavigationEntry> _entries = new();
    private int _currentIndex = -1;

    public NavigationEntry? Current => _currentIndex >= 0 && _currentIndex < _entries.Count ? _entries[_currentIndex] : null;

    public IReadOnlyList<NavigationEntry> Entries => _entries.AsReadOnly();

    public bool CanGoBack => _currentIndex > 0;

    public bool CanGoForward => _currentIndex >= 0 && _currentIndex < _entries.Count - 1;

    public NavigationEntry? Push(NavigationEntry entry, bool collapseDuplicates = true)
    {
        if (collapseDuplicates && Current is NavigationEntry current && current.Equals(entry))
        {
            return current;
        }

        if (_currentIndex < _entries.Count - 1)
        {
            _entries.RemoveRange(_currentIndex + 1, _entries.Count - (_currentIndex + 1));
        }

        _entries.Add(entry);
        _currentIndex = _entries.Count - 1;
        return entry;
    }

    public NavigationEntry? GoBack()
    {
        if (!CanGoBack)
        {
            return null;
        }

        _currentIndex--;
        return _entries[_currentIndex];
    }

    public NavigationEntry? GoForward()
    {
        if (!CanGoForward)
        {
            return null;
        }

        _currentIndex++;
        return _entries[_currentIndex];
    }

    public void Reset()
    {
        _entries.Clear();
        _currentIndex = -1;
    }
}

public readonly record struct NavigationEntry(string DocumentPath, string? Anchor);
