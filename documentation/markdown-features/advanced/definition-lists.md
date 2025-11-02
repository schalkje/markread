# Definition Lists

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Advanced](./) → Definition Lists

Definition lists create term-definition pairs, useful for glossaries.

## Basic Definition List

Some Markdown processors support definition lists:

```markdown
Term 1
: Definition for term 1

Term 2
: First definition for term 2
: Second definition for term 2
```

**Note**: Definition list support varies by Markdown processor. MarkRead uses Markdig which supports them with the Definition Lists extension.

## Glossary Example

```markdown
API
: Application Programming Interface - a set of protocols for building software.

Markdown
: A lightweight markup language for creating formatted text.

WebView2
: Microsoft's modern web view control based on Chromium Edge.

WPF
: Windows Presentation Foundation - Microsoft's UI framework.
```

Results in:

API
: Application Programming Interface - a set of protocols for building software.

Markdown
: A lightweight markup language for creating formatted text.

WebView2
: Microsoft's modern web view control based on Chromium Edge.

WPF
: Windows Presentation Foundation - Microsoft's UI framework.

## Multiple Definitions

```markdown
Light Theme
: A color scheme with light backgrounds and dark text.
: Better for well-lit environments.
: Reduces eye strain in bright conditions.

Dark Theme
: A color scheme with dark backgrounds and light text.
: Popular for coding and reading in low light.
: Reduces blue light exposure.
```

## Inline Formatting

```markdown
**MarkRead**
: A *modern* `Markdown` viewer for **Windows**
: Built with .NET 8 and WPF
: Supports code highlighting and [diagrams](../diagrams/mermaid-overview.md)
```

## Nested Content

```markdown
Service Layer
: The business logic layer of the application
  
  Contains:
  - MarkdownService
  - NavigationService  
  - TabService
  - SearchService
```

## Alternative Syntax

Some processors also support this syntax:

```markdown
<dl>
  <dt>Term</dt>
  <dd>Definition</dd>
</dl>
```

## HTML Output

Definition lists typically render as HTML `<dl>`, `<dt>`, and `<dd>` tags:

```html
<dl>
  <dt>API</dt>
  <dd>Application Programming Interface</dd>
  
  <dt>Markdown</dt>
  <dd>A lightweight markup language</dd>
</dl>
```

## Use Cases

**Glossaries:**
```markdown
Breadcrumb
: Navigation trail showing current location

Syntax Highlighting
: Colored display of code elements
```

**Technical Specifications:**
```markdown
Framework
: .NET 8

UI Technology
: WPF (Windows Presentation Foundation)

Web Control
: WebView2 (Chromium Edge)
```

**Configuration Options:**
```markdown
theme
: Color scheme for the application
: Values: `light`, `dark`, `auto`
: Default: `auto`

fontSize
: Text size in pixels
: Range: 8-32
: Default: 14
```

## Compatibility

Definition lists are supported by:
- ✅ Markdig (used by MarkRead)
- ✅ Python-Markdown
- ✅ PHP Markdown Extra
- ❌ CommonMark (core spec)
- ❌ GitHub Flavored Markdown

## See Also

- [Lists](../text-formatting/lists.md)
- [Task Lists](task-lists.md)
- [Tables](tables.md)
