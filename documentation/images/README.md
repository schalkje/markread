# Images Folder

This folder contains images used throughout the MarkRead documentation.

## Folder Structure

```
images/
├── screenshots/        # Application screenshots
├── diagrams/          # Exported diagrams (if needed)
├── icons/            # UI icons and symbols
└── examples/         # Example images for demos
```

## Screenshot Guidelines

### File Naming

- Use descriptive names: `main-window-dark-theme.png`
- Include feature name: `search-panel-results.png`
- Include theme if relevant: `sidebar-light-theme.png`

### Format

- **PNG** for UI screenshots (lossless)
- **JPG** for photos/complex images (smaller)
- **SVG** for diagrams (scalable)

### Size

- Maximum width: 1920px
- Typical size: 1200-1600px wide
- Optimize for web (compress)

## Example Images

For demonstration purposes:

### Sample Markdown Documents

- `sample-heading.png` - Heading hierarchy example
- `sample-code.png` - Code block example
- `sample-table.png` - Table rendering example
- `sample-diagram.png` - Mermaid diagram example

### Feature Screenshots

- `tab-bar.png` - Tab bar with multiple tabs
- `file-tree.png` - Sidebar file navigation
- `search-ui.png` - Search interface
- `theme-switcher.png` - Theme selection

## Placeholder Images

While building documentation, we reference images that will be added:

```markdown
![MarkRead Main Window](../../images/screenshots/main-window.png)
```

## Adding Images

1. Create image (screenshot/diagram/etc.)
2. Optimize file size
3. Place in appropriate subfolder
4. Reference in documentation:

```markdown
![Alt text](./path/to/image.png)
```

## Image Optimization

### Tools

- **TinyPNG** - PNG compression
- **ImageOptim** - General optimization
- **Squoosh** - Web-based optimizer

### Settings

- PNG: Compress with pngquant
- JPG: 80-90% quality
- SVG: Minify XML

## Attribution

If using external images, add attribution:

```markdown
![Image description](image.png)
*Image credit: [Source](https://example.com)*
```

## See Also

- [Images Markdown Guide](../markdown-features/text-formatting/images.md)
- [Diagrams](../markdown-features/diagrams/mermaid-overview.md)
