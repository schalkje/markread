# Footnotes

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Advanced](./) → Footnotes

Footnotes add references and additional information.

## Basic Footnote

```markdown
Here is a sentence with a footnote.[^1]

[^1]: This is the footnote content.
```

Results:

Here is a sentence with a footnote.[^1]

[^1]: This is the footnote content.

## Multiple Footnotes

```markdown
MarkRead[^markread] is built with .NET 8[^dotnet] and uses WebView2[^webview2].

[^markread]: A modern Markdown viewer for Windows
[^dotnet]: Latest version of Microsoft's .NET platform
[^webview2]: Microsoft Edge WebView2 control
```

## Named Footnotes

```markdown
This uses a named reference[^my-note].

[^my-note]: Footnotes can have descriptive names.
```

## Multi-Paragraph Footnotes

```markdown
Here's a complex footnote.[^complex]

[^complex]: This footnote has multiple paragraphs.

    It can include indented content.
    
    - List items
    - More items
    
    And code blocks:
    ```csharp
    var x = 1;
    ```
```

## Inline Footnotes

Some processors support inline footnotes:

```markdown
This is an inline footnote^[Inline content here].
```

## Practical Examples

### Citations

```markdown
Markdown was created by John Gruber in 2004[^gruber].

[^gruber]: John Gruber, "Markdown", 2004, https://daringfireball.net/projects/markdown/
```

### Technical Notes

```markdown
MarkRead uses Markdig for parsing[^markdig].

[^markdig]: Markdig is a fast, powerful Markdown processor for .NET. 
    It supports CommonMark and many extensions.
    See https://github.com/xoofx/markdig
```

### Definitions

```markdown
WPF[^wpf] provides the UI framework for MarkRead.

[^wpf]: **Windows Presentation Foundation** - A UI framework for building 
    Windows desktop applications with XAML and .NET.
```

## Footnote Numbering

Footnotes are automatically numbered:

```markdown
First reference[^1]
Second reference[^2]
Third reference[^3]

[^1]: First footnote
[^2]: Second footnote
[^3]: Third footnote
```

## Reusing Footnotes

Reference the same footnote multiple times:

```markdown
Markdown[^md] is great for documentation.
MarkRead displays Markdown[^md] beautifully.

[^md]: Markdown is a lightweight markup language.
```

## Footnote Placement

Footnote definitions can appear anywhere in the document:

```markdown
<!-- Define at top -->
[^note1]: Defined at document start

Some content here.[^note1]

More content.[^note2]

<!-- Define at bottom -->
[^note2]: Defined at document end
```

## HTML Output

Footnotes typically render as:

```html
<p>Text with footnote<sup id="fnref:1"><a href="#fn:1">1</a></sup></p>

<div class="footnotes">
  <ol>
    <li id="fn:1">
      <p>Footnote content <a href="#fnref:1">↩</a></p>
    </li>
  </ol>
</div>
```

## Best Practices

✅ Use for citations and references
✅ Keep footnotes concise
✅ Use descriptive footnote IDs
✅ Place definitions at document end

❌ Don't overuse - consider inline content
❌ Don't use for essential information
❌ Don't forget footnote definitions

## Compatibility

Footnotes are supported by:
- ✅ Markdig (used by MarkRead)
- ✅ Python-Markdown
- ✅ PHP Markdown Extra
- ✅ GitHub Flavored Markdown
- ❌ CommonMark (core spec - proposed extension)

## See Also

- [Links](../text-formatting/links.md)
- [Blockquotes](../text-formatting/blockquotes.md)
- [Definition Lists](definition-lists.md)
