# Images

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Text Formatting](./) → Images

Images enhance documentation with visual content.

## Basic Image Syntax

```markdown
![Alt text](image-path.png)
```

## Image with Title

```markdown
![Alt text](image.png "Image title")
```

## Relative Image Paths

```markdown
![Logo](./images/logo.png)
![Icon](../assets/icon.svg)
![Screenshot](../../screenshots/main.png)
```

## Image Sizing

While standard Markdown doesn't support sizing, you can use HTML:

```html
<img src="image.png" alt="Alt text" width="200" height="100">
<img src="image.png" alt="Alt text" width="50%">
```

## Clickable Images

Combine images with links:

```markdown
[![Alt text](thumbnail.png)](full-size.png)
[![GitHub](icon.png)](https://github.com)
```

## Supported Formats

- **PNG** - Best for screenshots, icons
- **JPG/JPEG** - Best for photos
- **GIF** - Animations
- **SVG** - Vector graphics
- **WebP** - Modern format

## Best Practices

✅ Use descriptive alt text
✅ Optimize image sizes
✅ Use relative paths
✅ Include images in repository
✅ Consistent naming convention

❌ Don't use huge images
❌ Don't use absolute paths
❌ Don't skip alt text

## Example

```markdown
![MarkRead Main Window](../../images/screenshots/main-window.png "MarkRead in action")
```

## See Also

- [Links](links.md)
- [Diagrams](../diagrams/mermaid-overview.md)
