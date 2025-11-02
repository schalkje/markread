# Strikethrough

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Advanced](./) → Strikethrough

Strikethrough text indicates deleted or deprecated content.

## Basic Syntax

Use double tildes `~~` around text:

```markdown
~~This text is crossed out~~
```

Results: ~~This text is crossed out~~

## Use Cases

### Showing Changes

```markdown
~~Old price: $99~~ 
**New price: $49**

~~Deprecated method~~ 
Use `NewMethod()` instead
```

Results:

~~Old price: $99~~ 
**New price: $49**

~~Deprecated method~~ 
Use `NewMethod()` instead

### Task Completion

```markdown
- ~~Complete project planning~~
- ~~Design user interface~~
- Implement features
- Write tests
```

Results:

- ~~Complete project planning~~
- ~~Design user interface~~
- Implement features
- Write tests

### Corrections

```markdown
The capital of Australia is ~~Sydney~~ **Canberra**.

MarkRead was built with ~~.NET 6~~ ~~.NET 7~~ **.NET 8**.
```

Results:

The capital of Australia is ~~Sydney~~ **Canberra**.

MarkRead was built with ~~.NET 6~~ ~~.NET 7~~ **.NET 8**.

## Combining with Other Formatting

### With Bold and Italic

```markdown
~~**Bold strikethrough**~~
~~*Italic strikethrough*~~
~~***Bold italic strikethrough***~~
```

Results:

~~**Bold strikethrough**~~
~~*Italic strikethrough*~~
~~***Bold italic strikethrough***~~

### With Links

```markdown
~~[Deprecated link](old-page.md)~~
[New link](new-page.md)
```

### With Code

```markdown
~~`oldFunction()`~~
Use `newFunction()` instead
```

Results:

~~`oldFunction()`~~
Use `newFunction()` instead

## In Tables

```markdown
| Feature | Status |
|---------|--------|
| ~~Old feature~~ | Removed |
| Current feature | Active |
| New feature | Coming soon |
```

Results:

| Feature | Status |
|---------|--------|
| ~~Old feature~~ | Removed |
| Current feature | Active |
| New feature | Coming soon |

## Documentation Examples

### API Changes

```markdown
## DeprecatedAPI

~~This API is deprecated and will be removed in v2.0~~

**Migration guide:**
- ~~`OldMethod()`~~ → `NewMethod()`
- ~~`oldProperty`~~ → `newProperty`
```

### Release Notes

```markdown
## Version 2.0

**Removed:**
- ~~Internet Explorer support~~
- ~~Legacy theme system~~
- ~~Old search algorithm~~

**Added:**
- Modern browser support
- New theme engine
- Fast search
```

### Settings

```markdown
## Configuration Options

~~`enableLegacyMode`~~ - Removed in v2.0
`theme` - Current theme selection
`fontSize` - Text size (8-32)
```

## HTML Output

Strikethrough renders as `<del>` or `<s>` tags:

```html
<p><del>Strikethrough text</del></p>
<!-- or -->
<p><s>Strikethrough text</s></p>
```

## Best Practices

✅ Use for deprecated content
✅ Show edits and corrections
✅ Indicate removed features
✅ Track completed tasks

❌ Don't overuse - reduces readability
❌ Don't use for emphasis (use **bold**)
❌ Don't use for deletion in formal docs

## Accessibility

Screen readers may skip or announce strikethrough differently. For important information:

```markdown
<!-- Not recommended for critical info -->
~~Critical information~~

<!-- Better approach -->
**Deprecated:** This feature is no longer supported.
```

## Compatibility

Strikethrough is widely supported:

- ✅ GitHub Flavored Markdown
- ✅ Markdig (used by MarkRead)
- ✅ Most modern processors
- ❌ CommonMark (core spec - extension)

## Alternative Syntax

Some processors support alternative strikethrough:

```markdown
<!-- Single tilde (some processors) -->
~strikethrough~

<!-- HTML -->
<del>strikethrough</del>
<s>strikethrough</s>
```

## See Also

- [Emphasis](../text-formatting/emphasis.md)
- [Task Lists](task-lists.md)
- [Footnotes](footnotes.md)
