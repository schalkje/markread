# File Formats

> 📍 **Navigation**: [Home](../../README.md) → [Documentation](../) → [Reference](./) → File Formats

Supported file formats and extensions in MarkRead.

## Markdown Files

### Standard Extensions

| Extension | Description | Supported |
|-----------|-------------|-----------|
| `.md` | Standard Markdown | ✅ Yes |
| `.markdown` | Alternative extension | ✅ Yes |
| `.mdown` | Alternative extension | ✅ Yes |
| `.mkd` | Alternative extension | ✅ Yes |
| `.mkdn` | Alternative extension | ✅ Yes |

### Special Markdown Files

| Filename | Purpose |
|----------|---------|
| `README.md` | Project readme |
| `CHANGELOG.md` | Version history |
| `CONTRIBUTING.md` | Contribution guide |
| `LICENSE.md` | License information |

## Text Files

| Extension | Description | Support |
|-----------|-------------|---------|
| `.txt` | Plain text | View as plain text |
| `.text` | Plain text | View as plain text |

## Configuration Files

### JSON

```json
// settings.json
{
  "theme": "dark",
  "fontSize": 14
}
```

### YAML

```yaml
# config.yml
theme: dark
fontSize: 14
```

### TOML

```toml
# config.toml
theme = "dark"
fontSize = 14
```

## File Detection

MarkRead detects file type by:

1. **Extension**: `.md`, `.markdown`, etc.
2. **Content analysis**: First line analysis
3. **MIME type**: If available

## Encoding Support

| Encoding | Support |
|----------|---------|
| UTF-8 | ✅ Full support (recommended) |
| UTF-8 with BOM | ✅ Supported |
| UTF-16 | ✅ Supported |
| UTF-32 | ✅ Supported |
| ASCII | ✅ Supported |
| ISO-8859-1 | ⚠️ Partial support |

**Recommendation**: Use UTF-8 without BOM for best compatibility.

## Line Endings

| Type | Characters | Platform | Support |
|------|------------|----------|---------|
| LF | `\n` | Unix/Linux/macOS | ✅ Full |
| CRLF | `\r\n` | Windows | ✅ Full |
| CR | `\r` | Old Mac | ✅ Full |

MarkRead handles all line ending types automatically.

## File Size Limits

| Limit | Size | Notes |
|-------|------|-------|
| Maximum file size | 50 MB | Configurable in settings |
| Recommended size | < 5 MB | Best performance |
| Large file warning | > 10 MB | Shows warning |

For files larger than 50 MB, consider:
- Splitting into smaller files
- Using external editor
- Increasing limit in settings

## Frontmatter Support

### YAML Frontmatter

```markdown
---
title: Document Title
author: John Doe
date: 2024-01-15
tags: [markdown, docs]
---

# Content starts here
```

### TOML Frontmatter

```markdown
+++
title = "Document Title"
author = "John Doe"
date = 2024-01-15
tags = ["markdown", "docs"]
+++

# Content starts here
```

### JSON Frontmatter

```markdown
{
  "title": "Document Title",
  "author": "John Doe",
  "date": "2024-01-15",
  "tags": ["markdown", "docs"]
}

# Content starts here
```

## Embedded Content

### Code Blocks

Syntax highlighting for:
- C# (`.cs`)
- JavaScript (`.js`, `.jsx`)
- TypeScript (`.ts`, `.tsx`)
- Python (`.py`)
- JSON (`.json`)
- YAML (`.yml`, `.yaml`)
- XML (`.xml`)
- HTML (`.html`, `.htm`)
- CSS (`.css`)
- SQL (`.sql`)
- Bash (`.sh`)
- PowerShell (`.ps1`)

### Images

| Format | Support | Notes |
|--------|---------|-------|
| PNG | ✅ Full | Best for screenshots |
| JPG/JPEG | ✅ Full | Best for photos |
| GIF | ✅ Full | Including animations |
| SVG | ✅ Full | Vector graphics |
| WebP | ✅ Full | Modern format |
| BMP | ⚠️ Limited | Not recommended |
| ICO | ⚠️ Limited | Icons only |

## File Metadata

MarkRead extracts metadata from:

```markdown
---
title: Page Title
description: Page description
keywords: markdown, viewer, documentation
author: Author Name
created: 2024-01-15
modified: 2024-01-20
---
```

Metadata affects:
- Window title
- Search indexing
- Navigation
- Document properties

## Workspace Files

### Folder Structure

```
project/
├── .markread/           # MarkRead config folder
│   ├── settings.json    # Workspace settings
│   ├── state.json       # UI state (tabs, etc.)
│   └── cache/          # Render cache
├── docs/               # Documentation
│   └── *.md           # Markdown files
└── README.md          # Root readme
```

### Settings File

`.markread/settings.json`:

```json
{
  "theme": "dark",
  "fontSize": 14,
  "excludePatterns": [
    "node_modules/**",
    ".git/**"
  ]
}
```

## Export Formats

MarkRead can export to:

| Format | Extension | Description |
|--------|-----------|-------------|
| HTML | `.html` | Standalone HTML |
| PDF | `.pdf` | Portable document |
| Plain Text | `.txt` | Stripped formatting |

## Import from Other Formats

⚠️ **Not directly supported** - use converters:

- **Word (.docx)**: Use Pandoc
- **PDF**: Use pdf2md
- **HTML**: Use html2markdown
- **Wiki**: Use wiki2markdown

## Best Practices

✅ Use `.md` extension
✅ UTF-8 encoding
✅ LF line endings (or CRLF on Windows)
✅ Keep files under 5 MB
✅ Use frontmatter for metadata

❌ Don't use proprietary formats
❌ Don't use unusual encodings
❌ Don't create huge files
❌ Don't mix line endings

## See Also

- [Configuration](configuration.md)
- [Installation](../user-guide/installation.md)
- [File Navigation](../user-guide/file-navigation.md)
