# Tables

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Advanced](./) → Tables

Tables organize data in rows and columns.

## Basic Table

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

Results in:

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

## Column Alignment

Use colons in the separator row:

```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| A    | B      | C     |
| 1    | 2      | 3     |
```

Results in:

| Left | Center | Right |
|:-----|:------:|------:|
| A    | B      | C     |
| 1    | 2      | 3     |

- `:---` - Left aligned (default)
- `:---:` - Center aligned
- `---:` - Right aligned

## Formatting in Tables

Use markdown formatting in cells:

| Feature | Syntax | Example |
|---------|--------|---------|
| **Bold** | `**text**` | **bold text** |
| *Italic* | `*text*` | *italic text* |
| `Code` | `` `text` `` | `code text` |
| [Link](.) | `[text](url)` | [click here](.) |

## Complex Table Example

```markdown
| Language | Syntax Highlighting | File Extension | Popularity |
|:---------|:-------------------:|:--------------:|-----------:|
| Python   | ✅ Yes              | `.py`          | Very High  |
| JavaScript | ✅ Yes            | `.js`          | Very High  |
| C#       | ✅ Yes              | `.cs`          | High       |
| SQL      | ✅ Yes              | `.sql`         | High       |
| YAML     | ✅ Yes              | `.yml`         | Medium     |
```

Results in:

| Language | Syntax Highlighting | File Extension | Popularity |
|:---------|:-------------------:|:--------------:|-----------:|
| Python   | ✅ Yes              | `.py`          | Very High  |
| JavaScript | ✅ Yes            | `.js`          | Very High  |
| C#       | ✅ Yes              | `.cs`          | High       |
| SQL      | ✅ Yes              | `.sql`         | High       |
| YAML     | ✅ Yes              | `.yml`         | Medium     |

## Best Practices

- Keep tables simple and readable
- Align pipes for source readability (optional)
- Use alignment for numeric data (right-align)
- Don't over-complicate with too many columns
- Consider lists for simple data

## See Also

- [Lists](../text-formatting/lists.md)
- [Emphasis](../text-formatting/emphasis.md)
