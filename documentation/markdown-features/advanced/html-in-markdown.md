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

### Paragraphs

```markdown
<p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
```

### Line Breaks

```markdown
Line one<br>
Line two<br>
Line three
```

## Images with HTML

### Sized Images

```markdown
<img src="image.png" alt="Description" width="300" height="200">
<img src="image.png" alt="Description" width="50%">
```

### Aligned Images

```markdown
<img src="logo.png" alt="Logo" align="right" width="100">
Text flows around the image...
```

### Centered Images

```markdown
<p align="center">
  <img src="screenshot.png" alt="Screenshot" width="600">
</p>
```

## Tables

### Colspan and Rowspan

```html
<table>
  <tr>
    <th colspan="2">Header spanning 2 columns</th>
  </tr>
  <tr>
    <td>Cell 1</td>
    <td>Cell 2</td>
  </tr>
</table>
```

### Styled Tables

```html
<table border="1" cellpadding="10" cellspacing="0">
  <thead>
    <tr style="background-color: #f0f0f0;">
      <th>Name</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Item 1</td>
      <td>100</td>
    </tr>
  </tbody>
</table>
```

## Formatting

### Text Alignment

```html
<p align="left">Left aligned text</p>
<p align="center">Center aligned text</p>
<p align="right">Right aligned text</p>
```

### Colors

```html
<span style="color: red;">Red text</span>
<span style="color: #007ACC;">Blue text</span>
<span style="background-color: yellow;">Highlighted</span>
```

### Font Sizing

```html
<span style="font-size: 24px;">Large text</span>
<span style="font-size: 12px;">Small text</span>
```

## Layout

### Divisions

```html
<div style="border: 1px solid #ccc; padding: 10px;">
  <h3>Box Title</h3>
  <p>Content in a box</p>
</div>
```

### Columns

```html
<div style="display: flex;">
  <div style="flex: 1; padding: 10px;">
    <h4>Column 1</h4>
    <p>Content</p>
  </div>
  <div style="flex: 1; padding: 10px;">
    <h4>Column 2</h4>
    <p>Content</p>
  </div>
</div>
```

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
  <dt>Term 1</dt>
  <dd>Definition for term 1</dd>
  
  <dt>Term 2</dt>
  <dd>Definition for term 2</dd>
</dl>
```

## Mixing HTML and Markdown

```html
<div style="border-left: 4px solid #007ACC; padding-left: 16px;">

## Markdown Heading

This is **markdown** with *formatting*.

- List item 1
- List item 2

</div>
```

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
