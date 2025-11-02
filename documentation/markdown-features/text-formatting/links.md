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
