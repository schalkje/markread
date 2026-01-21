# HTML in Markdown

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Advanced](./) → HTML in Markdown

Markdown supports embedding HTML for advanced formatting.

## Why Use HTML?

When Markdown syntax isn't enough:
- Image sizing and alignment
- Complex tables
- Custom styling
- Video embedding
- Advanced layouts

## Basic HTML Elements

### Headings

```markdown
<h1>HTML Heading 1</h1>
<h2>HTML Heading 2</h2>
```

<h1>HTML Heading 1</h1>
<h2>HTML Heading 2</h2>

### Paragraphs

```markdown
<p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
```

<p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>

### Line Breaks

```markdown
Line one<br>
Line two<br>
Line three
```

Line one<br>
Line two<br>
Line three

## Images with HTML

### Sized Images

```html
<img src="../../../assets/markread-icon.png" alt="MarkRead Icon" width="100" height="100">
<img src="../../../assets/markread-logo.png" alt="MarkRead Logo" width="200">
```

**Result:**

<img src="../../../assets/markread-icon.png" alt="MarkRead Icon" width="100" height="100">

<img src="../../../assets/markread-logo.png" alt="MarkRead Logo" width="200">

### Aligned Images

```html
<img src="../../../assets/markread-icon.png" alt="Logo" align="right" width="100">

Text flows around the image when using the align attribute. This is useful for creating magazine-style layouts where images sit alongside text content. The text will wrap around the image automatically.
```

**Result:**

<img src="../../../assets/markread-icon.png" alt="Logo" align="right" width="100">

Text flows around the image when using the align attribute. This is useful for creating magazine-style layouts where images sit alongside text content. The text will wrap around the image automatically.

<br clear="right">

### Centered Images

```html
<p align="center">
  <img src="../../../assets/markread-logo.png" alt="MarkRead Logo" width="300">
</p>
```

**Result:**

<p align="center">
  <img src="../../../assets/markread-logo.png" alt="MarkRead Logo" width="300">
</p>

## Tables

### Colspan and Rowspan

```html
<table border="1" cellpadding="8" cellspacing="0">
  <tr>
    <th colspan="2">Header spanning 2 columns</th>
    <th rowspan="2">Rowspan</th>
  </tr>
  <tr>
    <td>Cell 1</td>
    <td>Cell 2</td>
  </tr>
  <tr>
    <td>Cell 3</td>
    <td colspan="2">Cell 4 (spans 2 columns)</td>
  </tr>
</table>
```

**Result:**

<table border="1" cellpadding="8" cellspacing="0">
  <tr>
    <th colspan="2">Header spanning 2 columns</th>
    <th rowspan="2">Rowspan</th>
  </tr>
  <tr>
    <td>Cell 1</td>
    <td>Cell 2</td>
  </tr>
  <tr>
    <td>Cell 3</td>
    <td colspan="2">Cell 4 (spans 2 columns)</td>
  </tr>
</table>

### Styled Tables

```html
<table border="1" cellpadding="10" cellspacing="0">
  <thead>
    <tr style="background-color: #007ACC; color: white;">
      <th>Feature</th>
      <th>Status</th>
      <th>Priority</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>HTML Support</td>
      <td style="color: green; font-weight: bold;">✓ Enabled</td>
      <td>High</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td>Mermaid Diagrams</td>
      <td style="color: green; font-weight: bold;">✓ Enabled</td>
      <td>High</td>
    </tr>
    <tr>
      <td>Syntax Highlighting</td>
      <td style="color: green; font-weight: bold;">✓ Enabled</td>
      <td>Medium</td>
    </tr>
  </tbody>
</table>
```

**Result:**

<table border="1" cellpadding="10" cellspacing="0">
  <thead>
    <tr style="background-color: #007ACC; color: white;">
      <th>Feature</th>
      <th>Status</th>
      <th>Priority</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>HTML Support</td>
      <td style="color: green; font-weight: bold;">✓ Enabled</td>
      <td>High</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td>Mermaid Diagrams</td>
      <td style="color: green; font-weight: bold;">✓ Enabled</td>
      <td>High</td>
    </tr>
    <tr>
      <td>Syntax Highlighting</td>
      <td style="color: green; font-weight: bold;">✓ Enabled</td>
      <td>Medium</td>
    </tr>
  </tbody>
</table>

## Formatting

### Text Alignment

```html
<p align="left">Left aligned text (default)</p>
<p align="center">Center aligned text</p>
<p align="right">Right aligned text</p>
```

**Result:**

<p align="left">Left aligned text (default)</p>
<p align="center">Center aligned text</p>
<p align="right">Right aligned text</p>

### Colors

```html
<span style="color: red;">Red text</span> |
<span style="color: #007ACC;">Blue text</span> |
<span style="background-color: yellow; padding: 2px 4px;">Highlighted text</span> |
<span style="color: white; background-color: #28a745; padding: 2px 6px; border-radius: 3px;">Success</span>
```

**Result:**

<span style="color: red;">Red text</span> |
<span style="color: #007ACC;">Blue text</span> |
<span style="background-color: yellow; padding: 2px 4px;">Highlighted text</span> |
<span style="color: white; background-color: #28a745; padding: 2px 6px; border-radius: 3px;">Success</span>

### Font Sizing

```html
<span style="font-size: 24px; font-weight: bold;">Large text (24px)</span><br>
<span style="font-size: 16px;">Normal text (16px)</span><br>
<span style="font-size: 12px;">Small text (12px)</span><br>
<span style="font-size: 10px;">Tiny text (10px)</span>
```

**Result:**

<span style="font-size: 24px; font-weight: bold;">Large text (24px)</span><br>
<span style="font-size: 16px;">Normal text (16px)</span><br>
<span style="font-size: 12px;">Small text (12px)</span><br>
<span style="font-size: 10px;">Tiny text (10px)</span>

## Layout

### Divisions

```html
<div style="border: 2px solid #007ACC; border-radius: 8px; padding: 16px; background-color: #f0f8ff;">
  <h3 style="margin-top: 0; color: #007ACC;">📦 Box Title</h3>
  <p>Content in a styled box with border, padding, and background color.</p>
  <p style="margin-bottom: 0;">Boxes are great for callouts, warnings, or highlighting important information.</p>
</div>
```

**Result:**

<div style="border: 2px solid #007ACC; border-radius: 8px; padding: 16px; background-color: #f0f8ff;">
  <h3 style="margin-top: 0; color: #007ACC;">📦 Box Title</h3>
  <p>Content in a styled box with border, padding, and background color.</p>
  <p style="margin-bottom: 0;">Boxes are great for callouts, warnings, or highlighting important information.</p>
</div>

### Warning/Info Boxes

```html
<div style="border-left: 4px solid #ffc107; background-color: #fff3cd; padding: 12px; margin: 10px 0;">
  <strong>⚠️ Warning:</strong> This is an important warning message.
</div>

<div style="border-left: 4px solid #17a2b8; background-color: #d1ecf1; padding: 12px; margin: 10px 0;">
  <strong>ℹ️ Info:</strong> This is an informational message.
</div>

<div style="border-left: 4px solid #dc3545; background-color: #f8d7da; padding: 12px; margin: 10px 0;">
  <strong>❌ Error:</strong> This is an error message.
</div>
```

**Result:**

<div style="border-left: 4px solid #ffc107; background-color: #fff3cd; padding: 12px; margin: 10px 0;">
  <strong>⚠️ Warning:</strong> This is an important warning message.
</div>

<div style="border-left: 4px solid #17a2b8; background-color: #d1ecf1; padding: 12px; margin: 10px 0;">
  <strong>ℹ️ Info:</strong> This is an informational message.
</div>

<div style="border-left: 4px solid #dc3545; background-color: #f8d7da; padding: 12px; margin: 10px 0;">
  <strong>❌ Error:</strong> This is an error message.
</div>

### Columns

```html
<div style="display: flex; gap: 20px;">
  <div style="flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
    <h4 style="margin-top: 0;">📝 Column 1</h4>
    <p>First column content with flex layout.</p>
    <ul>
      <li>Feature A</li>
      <li>Feature B</li>
    </ul>
  </div>
  <div style="flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
    <h4 style="margin-top: 0;">🎨 Column 2</h4>
    <p>Second column content with equal width.</p>
    <ul>
      <li>Feature C</li>
      <li>Feature D</li>
    </ul>
  </div>
</div>
```

**Result:**

<div style="display: flex; gap: 20px;">
  <div style="flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
    <h4 style="margin-top: 0;">📝 Column 1</h4>
    <p>First column content with flex layout.</p>
    <ul>
      <li>Feature A</li>
      <li>Feature B</li>
    </ul>
  </div>
  <div style="flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
    <h4 style="margin-top: 0;">🎨 Column 2</h4>
    <p>Second column content with equal width.</p>
    <ul>
      <li>Feature C</li>
      <li>Feature D</li>
    </ul>
  </div>
</div>

## Media

### Videos

```html
<video width="600" controls>
  <source src="demo.mp4" type="video/mp4">
  Your browser doesn't support video.
</video>
```

### YouTube Embed

```html
<iframe 
  width="560" 
  height="315" 
  src="https://www.youtube.com/embed/VIDEO_ID"
  frameborder="0" 
  allowfullscreen>
</iframe>
```

### Audio

```html
<audio controls>
  <source src="audio.mp3" type="audio/mpeg">
  Your browser doesn't support audio.
</audio>
```

## Interactive Elements

### Details/Summary

```html
<details>
  <summary>Click to expand</summary>
  <p>Hidden content that appears when expanded.</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</details>
```

Results:

<details>
  <summary>Click to expand</summary>
  <p>Hidden content that appears when expanded.</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</details>

## Definition Lists

```html
<dl>
  <dt><strong>HTML</strong></dt>
  <dd>HyperText Markup Language - the standard markup language for web pages</dd>

  <dt><strong>CSS</strong></dt>
  <dd>Cascading Style Sheets - used for styling HTML elements</dd>

  <dt><strong>Markdown</strong></dt>
  <dd>A lightweight markup language for creating formatted text</dd>
</dl>
```

**Result:**

<dl>
  <dt><strong>HTML</strong></dt>
  <dd>HyperText Markup Language - the standard markup language for web pages</dd>

  <dt><strong>CSS</strong></dt>
  <dd>Cascading Style Sheets - used for styling HTML elements</dd>

  <dt><strong>Markdown</strong></dt>
  <dd>A lightweight markup language for creating formatted text</dd>
</dl>

## Mixing HTML and Markdown

```html
<div style="border-left: 4px solid #007ACC; padding-left: 16px; margin: 20px 0;">

## Markdown Heading

This is **markdown** with *formatting* and `inline code`.

- List item 1
- List item 2
- List item with [link](https://example.com)

You can mix **HTML** and _Markdown_ freely!

</div>
```

**Result:**

<div style="border-left: 4px solid #007ACC; padding-left: 16px; margin: 20px 0;">

## Markdown Heading

This is **markdown** with *formatting* and `inline code`.

- List item 1
- List item 2
- List item with [link](https://example.com)

You can mix **HTML** and _Markdown_ freely!

</div>

**Note:** Some processors require blank lines between HTML and Markdown.

## Comments

```html
<!-- This is an HTML comment -->
<!-- It won't appear in the rendered output -->

<!-- 
Multi-line
comment
-->
```

## Security Considerations

### Sanitization

MarkRead sanitizes HTML by default:
- Removes `<script>` tags
- Removes event handlers (`onclick`, etc.)
- Removes dangerous attributes
- Allows safe HTML elements

### Safe HTML

```html
<!-- Safe -->
<img src="image.png" alt="Image">
<a href="page.html">Link</a>
<p style="color: red;">Text</p>

<!-- Blocked by sanitizer -->
<script>alert('XSS')</script>
<img src="x" onerror="alert('XSS')">
<iframe src="evil.com"></iframe>
```

## Common Use Cases

### Feature Comparison Table

```html
<table border="1" cellpadding="10" cellspacing="0" style="width: 100%;">
  <thead>
    <tr style="background-color: #007ACC; color: white;">
      <th>Feature</th>
      <th>Free</th>
      <th>Pro</th>
      <th>Enterprise</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Markdown Support</strong></td>
      <td align="center">✓</td>
      <td align="center">✓</td>
      <td align="center">✓</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td><strong>HTML in Markdown</strong></td>
      <td align="center">✓</td>
      <td align="center">✓</td>
      <td align="center">✓</td>
    </tr>
    <tr>
      <td><strong>Mermaid Diagrams</strong></td>
      <td align="center">—</td>
      <td align="center">✓</td>
      <td align="center">✓</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td><strong>Advanced Features</strong></td>
      <td align="center">—</td>
      <td align="center">—</td>
      <td align="center">✓</td>
    </tr>
  </tbody>
</table>
```

**Result:**

<table border="1" cellpadding="10" cellspacing="0" style="width: 100%;">
  <thead>
    <tr style="background-color: #007ACC; color: white;">
      <th>Feature</th>
      <th>Free</th>
      <th>Pro</th>
      <th>Enterprise</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Markdown Support</strong></td>
      <td align="center">✓</td>
      <td align="center">✓</td>
      <td align="center">✓</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td><strong>HTML in Markdown</strong></td>
      <td align="center">✓</td>
      <td align="center">✓</td>
      <td align="center">✓</td>
    </tr>
    <tr>
      <td><strong>Mermaid Diagrams</strong></td>
      <td align="center">—</td>
      <td align="center">✓</td>
      <td align="center">✓</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td><strong>Advanced Features</strong></td>
      <td align="center">—</td>
      <td align="center">—</td>
      <td align="center">✓</td>
    </tr>
  </tbody>
</table>

### Card Layout

```html
<div style="display: flex; gap: 15px; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 200px; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
    <h3 style="margin-top: 0;">🚀 Fast</h3>
    <p>Lightning-fast markdown rendering with optimized performance.</p>
  </div>
  <div style="flex: 1; min-width: 200px; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
    <h3 style="margin-top: 0;">🔒 Secure</h3>
    <p>Built-in XSS protection with DOMPurify sanitization.</p>
  </div>
  <div style="flex: 1; min-width: 200px; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
    <h3 style="margin-top: 0;">💎 Beautiful</h3>
    <p>Gorgeous syntax highlighting and diagram support.</p>
  </div>
</div>
```

**Result:**

<div style="display: flex; gap: 15px; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 200px; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
    <h3 style="margin-top: 0;">🚀 Fast</h3>
    <p>Lightning-fast markdown rendering with optimized performance.</p>
  </div>
  <div style="flex: 1; min-width: 200px; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
    <h3 style="margin-top: 0;">🔒 Secure</h3>
    <p>Built-in XSS protection with DOMPurify sanitization.</p>
  </div>
  <div style="flex: 1; min-width: 200px; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
    <h3 style="margin-top: 0;">💎 Beautiful</h3>
    <p>Gorgeous syntax highlighting and diagram support.</p>
  </div>
</div>

### Badge/Label System

```html
<p>
  <span style="background-color: #28a745; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">STABLE</span>
  <span style="background-color: #007bff; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">v2.0</span>
  <span style="background-color: #6f42c1; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">NEW</span>
  <span style="background-color: #fd7e14; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">BETA</span>
  <span style="background-color: #dc3545; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">DEPRECATED</span>
</p>
```

**Result:**

<p>
  <span style="background-color: #28a745; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">STABLE</span>
  <span style="background-color: #007bff; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">v2.0</span>
  <span style="background-color: #6f42c1; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">NEW</span>
  <span style="background-color: #fd7e14; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">BETA</span>
  <span style="background-color: #dc3545; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">DEPRECATED</span>
</p>

## Best Practices

✅ Use Markdown when possible
✅ Use HTML for advanced layouts
✅ Keep HTML simple and clean
✅ Test rendering in MarkRead

❌ Don't overuse HTML
❌ Don't use for basic formatting
❌ Don't include scripts
❌ Don't rely on external CSS

## Limitations

Some HTML may not work:
- JavaScript is blocked (security)
- External stylesheets may not load
- Some tags filtered by sanitizer
- CSS support varies

## See Also

- [Images](../text-formatting/images.md)
- [Tables](tables.md)
- [Definition Lists](definition-lists.md)
