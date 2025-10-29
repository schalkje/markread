# Frequently Asked Questions (FAQ)

> 📍 **Navigation**: [Home](../../README.md) → [Documentation](../README.md) → [User Guide](.) → FAQ

Quick answers to common questions about MarkRead.

## General Questions

### What is MarkRead?

MarkRead is a desktop application for viewing Markdown files on Windows. It's designed for developers and technical writers who work with local documentation.

**Key Features**:
- Beautiful rendering of Markdown files
- Tabbed interface for multiple documents
- File tree navigation
- In-page and global search
- Dark and light themes
- Mermaid diagram support
- Syntax highlighting for code blocks

See [Getting Started](getting-started.md) for more.

### Is MarkRead free?

Yes! MarkRead is completely free and open source under the MIT License. No trials, no subscriptions, no hidden costs.

### Can MarkRead edit Markdown files?

No. MarkRead is a **viewer only**. It's designed for reading and navigating documentation, not editing.

**For editing**, use:
- VS Code
- Typora
- Obsidian
- Any text editor

**Pro tip**: Keep your editor and MarkRead open side-by-side. Edit in your editor, view in MarkRead with auto-reload enabled.

### Does MarkRead work offline?

Yes! MarkRead is completely offline after installation. It:
- ✅ Works without internet connection
- ✅ Stores everything locally
- ✅ Doesn't send any data anywhere
- ✅ No telemetry or tracking

The only network access is:
- Checking for updates (optional, can be disabled)
- Opening external HTTP links in your browser

### What operating systems does MarkRead support?

**Supported**:
- Windows 10 (version 1809 or later)
- Windows 11

**Not supported**:
- macOS
- Linux
- Windows 7/8/8.1

**Why Windows only?**  
MarkRead uses WPF (Windows Presentation Foundation) which is Windows-specific. A cross-platform version using Electron or Tauri is being considered for the future.

## Features and Capabilities

### Can MarkRead render math equations?

Not in the current version (MVP). Math rendering (KaTeX/MathJax) is planned for a future release.

**Current workaround**:
- Use images for equations
- Use code blocks for plain math notation
- Use external tools for math-heavy docs

### Does MarkRead support PlantUML?

Not currently. Only Mermaid diagrams are supported in the MVP.

**Supported**:
- ✅ Mermaid (flowcharts, sequence, class, state, gantt, pie)

**Planned**:
- PlantUML
- GraphViz DOT
- Custom diagram plugins

### Can I export to PDF?

Yes! Use `Ctrl+P` to print, then "Save as PDF" in the print dialog.

**Features**:
- Preserves syntax highlighting
- Includes Mermaid diagrams
- Respects light/dark theme
- Customizable margins and page breaks

See [Advanced Features](advanced-features.md#export-and-print).

### Does MarkRead support themes?

Yes! MarkRead includes:
- **System theme** - Matches Windows
- **Light theme** - Bright mode
- **Dark theme** - Dark mode

You can also:
- Customize fonts and colors
- Create custom themes (JSON)
- Use custom CSS for advanced styling

See [Themes and Customization](themes.md).

### What Markdown syntax is supported?

MarkRead supports GitHub Flavored Markdown (GFM) including:

**Standard**:
- Headings, paragraphs, line breaks
- Bold, italic, strikethrough
- Lists (ordered, unordered, nested)
- Links and images
- Code blocks and inline code
- Blockquotes
- Horizontal rules

**Extended**:
- Tables
- Task lists (checkboxes)
- Fenced code blocks with syntax highlighting
- Autolinks
- Emoji :smile:

**Diagrams**:
- Mermaid diagrams

See [Markdown Features](../markdown-features/) for complete showcase.

## Usage Questions

### How do I open a folder?

```
Method 1: Ctrl+O → Select folder
Method 2: Command line: markread "C:\path\to\folder"
Method 3: Drag folder onto MarkRead.exe
Method 4: Right-click folder → "Open with MarkRead"
```

See [Basic Usage](basic-usage.md).

### Can I open multiple folders at once?

Not in the same window. But you can:
1. Open multiple MarkRead windows (one per folder)
2. Or organize all your docs in one root folder with subfolders

```powershell
# Open two windows
markread "C:\Project1\docs"
markread --new-window "C:\Project2\docs"
```

### How do I search across all files?

```
Ctrl+Shift+F - Opens global search
```

Then type your search term. Results show all matching files.

See [Search Features](search-features.md#global-search).

### Can I bookmark files?

Not yet. Bookmarks/favorites are planned for a future release.

**Current workarounds**:
- Pin frequently-used files in your editor
- Create a "Quick Links" README with links to important docs
- Use Recent Files (`Ctrl+Shift+E`)

### How do I see recent files?

```
Ctrl+Shift+E - Shows last 20 opened files
```

### Can I compare two files side-by-side?

Not built-in, but you can:

**Option 1**: Multiple tabs
- Open both files in tabs
- Switch between them with `Ctrl+Tab`

**Option 2**: Multiple windows
```powershell
markread file1.md
markread --new-window file2.md
# Arrange windows side-by-side with Win+Arrow
```

**Option 3**: Use split screen (future feature)

## Technical Questions

### What languages have syntax highlighting?

**MVP includes**:
- Python
- SQL
- YAML
- C#
- JavaScript / TypeScript
- JSON
- Bash / Shell
- PowerShell

**Future releases** will add more languages via Highlight.js.

### How does link resolution work?

**Relative links** resolve from current file:
```markdown
[Doc](./other.md)        → Same folder
[Doc](../parent.md)      → Parent folder
[Doc](sub/nested.md)     → Subfolder
```

**Root-relative links** (starting with `/`) resolve from folder root:
```markdown
[API](/docs/api.md)      → /docs/api.md from root
```

**External links** (http/https) open in browser.

See [File Navigation](file-navigation.md#link-navigation).

### Does MarkRead watch for file changes?

Yes! Auto-reload is enabled by default.

**How it works**:
1. You edit file in your editor
2. Save the file
3. MarkRead detects change (300ms delay)
4. Document refreshes automatically
5. Scroll position is preserved

**Disable if needed**:
```
Settings → Behavior → Auto-reload on File Change ✗
```

### Where are settings stored?

```
%APPDATA%\MarkRead\settings.json
```

On Windows, usually:
```
C:\Users\YourName\AppData\Roaming\MarkRead\settings.json
```

**Portable version**:
```
MarkRead\settings.json (next to .exe)
```

### Can I use MarkRead from command line?

Yes! See [Command Line Reference](../reference/command-line.md).

```powershell
# Basic
markread path/to/folder

# With options
markread --theme dark --no-sidebar docs/

# Open specific file
markread README.md

# Multiple files in tabs
markread file1.md file2.md file3.md
```

## Troubleshooting Questions

### MarkRead won't start. What do I do?

**First steps**:
1. Restart computer
2. Run as Administrator
3. Check Windows Event Viewer for errors
4. Try verbose mode:
   ```powershell
   markread --verbose
   ```

See [Troubleshooting](troubleshooting.md#startup-issues) for detailed solutions.

### Links aren't working. Why?

**Common causes**:
1. Using backslashes `\` instead of forward slashes `/`
2. File doesn't exist at that path
3. File is outside the opened folder
4. Incorrect relative path

**Fix**:
```markdown
<!-- Wrong -->
[Doc](folder\file.md)

<!-- Correct -->
[Doc](folder/file.md)
```

See [Troubleshooting Links](troubleshooting.md#navigation-issues).

### Mermaid diagrams aren't rendering. Help?

**Checklist**:
1. ✓ Using triple backticks with `mermaid` language
2. ✓ Diagram syntax is valid
3. ✓ No typos in node names
4. ✓ Check browser console (`F12`) for errors

**Test at [mermaid.live](https://mermaid.live)**

See [Troubleshooting](troubleshooting.md#mermaid-diagrams-not-showing).

### Why is MarkRead using so much memory?

**Common causes**:
- Many tabs open
- Large files loaded
- Many images in documents
- Search index for large folder

**Solutions**:
```
Close unused tabs: Ctrl+W
Settings → Performance → Aggressive Memory Saving ✓
Settings → Performance → Inactive Tab Unload Time: 5 min
```

See [Performance Troubleshooting](troubleshooting.md#high-memory-usage).

## Comparison Questions

### MarkRead vs Typora?

**Typora**:
- ✅ WYSIWYG editor
- ✅ Cross-platform
- ❌ Paid software
- ❌ Not focused on browsing many docs

**MarkRead**:
- ✅ Free and open source
- ✅ Optimized for documentation browsing
- ✅ File tree navigation
- ✅ Fast startup
- ❌ Windows only
- ❌ No editing

**Use MarkRead for**: Browsing documentation  
**Use Typora for**: Writing/editing Markdown

### MarkRead vs Obsidian?

**Obsidian**:
- ✅ Knowledge management features
- ✅ Graph view, backlinks
- ✅ Plugins and extensions
- ✅ Cross-platform
- ❌ More complex
- ❌ Designed for notes, not project docs

**MarkRead**:
- ✅ Simple, focused viewer
- ✅ Perfect for Git repo documentation
- ✅ No database or special files
- ✅ Lightweight and fast
- ❌ No editing
- ❌ No graph view or backlinks

**Use MarkRead for**: Project documentation, README files  
**Use Obsidian for**: Personal knowledge base

### MarkRead vs VS Code Markdown Preview?

**VS Code Preview**:
- ✅ Integrated in editor
- ✅ Side-by-side editing
- ✅ Extensions available

**MarkRead**:
- ✅ Dedicated full-window experience
- ✅ Better performance for browsing
- ✅ File tree sidebar
- ✅ Multiple tabs
- ✅ Better search
- ✅ Doesn't use editor resources

**Use both!** Edit in VS Code, view in MarkRead.

## Future Features

### What features are planned?

See our [roadmap](https://github.com/schalkje/markread/projects/1), but highlights:

**Near term**:
- Bookmarks/favorites
- Split view
- More export formats
- Math equations (KaTeX)
- More syntax highlighting languages

**Long term**:
- Plugin system
- Cross-platform version
- Collaborative features
- Cloud sync

### How can I request a feature?

1. Check [existing feature requests](https://github.com/schalkje/markread/issues?q=is%3Aissue+label%3Aenhancement)
2. If not there, [open new issue](https://github.com/schalkje/markread/issues/new)
3. Use "Feature Request" template
4. Describe use case and benefit

### Can I contribute?

Yes! MarkRead is open source.

**Ways to contribute**:
- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 💻 Submit pull requests
- 🌍 Translate to other languages

See [Contributing Guide](../developer/contributing.md).

## Still Have Questions?

**Documentation**:
- [User Guide](.) - Complete usage documentation
- [Troubleshooting](troubleshooting.md) - Solve common issues

**Community**:
- [GitHub Discussions](https://github.com/schalkje/markread/discussions) - Ask questions
- [GitHub Issues](https://github.com/schalkje/markread/issues) - Report bugs

**Other**:
- [About MarkRead](../../README.md) - Project overview
- [Developer Docs](../developer/) - Technical details

---

[← Back to User Guide](./)
