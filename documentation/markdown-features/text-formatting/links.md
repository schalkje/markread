# Links

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Text Formatting](./) → Links

Links connect documents and enable navigation.

## Basic Links

```markdown
[Link text](URL)
```

Example:
[Visit GitHub](https://github.com)

## Internal Links

### Relative Links

```markdown
[Other page](other-page.md)
[Nested page](./subfolder/page.md)
[Parent page](../parent.md)
```

### Root-Relative Links

```markdown
[API Docs](/docs/api.md)
[Home](/README.md)
```

### Anchor Links

```markdown
[Jump to section](#section-name)
[Other file section](other.md#installation)
```

### How Links Open

- A link to another page opens that page at the top. Following a link never keeps the scroll position of the
  page you came from. Back / Forward (`Alt+←` / `Alt+→`) and the history panel still return you to where you were.
- A link with a `#fragment` (`other.md#installation`) opens the page and aligns the heading with the top of the
  content area, using the same offset and smooth / instant setting as the outline panel. Fragments are matched
  exactly first, then case-insensitively (`other.md#Installation` also works). If no heading matches, the page
  opens at the top and a warning is logged.
- A link back to the page you are reading (`README.md#setup` while on README) jumps within the page without
  reloading it; `./README.md` without a fragment scrolls to the top.
- `Ctrl`/`Cmd`+click opens the page in a new tab and `Shift`+click in a new window; both honour the fragment.
  Opening a page that is already open in another tab focuses that tab and keeps its scroll position.

[Jump to section](## Reference Links)

## Reference Links

```markdown
[Link text][reference]

[reference]: https://example.com "Optional title"
```

## Automatic Links

```markdown
<https://example.com>
<email@example.com>
```

Results:
<https://example.com>
<email@example.com>

## Link with Title

```markdown
[GitHub](https://github.com "Visit GitHub")
```

Hover shows tooltip: [GitHub](https://github.com "Visit GitHub")

## Best Practices

✅ Use descriptive link text
✅ Test all internal links
✅ Use relative paths for project files
✅ Include https:// for external links

❌ Avoid "click here" as link text
❌ Don't use absolute file paths
❌ Don't break links across lines

## See Also

- [Images](images.md)
- [Headings](headings.md) - Anchor targets
- [File Navigation](../../user-guide/file-navigation.md)
