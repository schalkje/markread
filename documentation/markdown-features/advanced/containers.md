# Containers (Callouts)

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Advanced](./) → Containers

Containers (also called callouts or admonitions) let you highlight important information with custom styling. They're perfect for warnings, tips, notes, and other special content.

## Basic Container

```markdown
::: info
This is an info callout with default title.
:::
```

Results:

::: info
This is an info callout with default title.
:::

## Container Types

MarkRead supports five container types with distinct colors:

### Info (Blue)

```markdown
::: info
Information messages and helpful tips.
:::
```

::: info
Information messages and helpful tips.
:::

### Warning (Orange)

```markdown
::: warning
*here be dragons*
:::
```

::: warning
*here be dragons*
:::

### Error (Red)

```markdown
::: error
Critical errors and important warnings.
:::
```

::: error
Critical errors and important warnings.
:::

### Success (Green)

```markdown
::: success
Successful operations and positive feedback.
:::
```

::: success
Successful operations and positive feedback.
:::

### Note (Purple)

```markdown
::: note
Additional notes and side comments.
:::
```

::: note
Additional notes and side comments.
:::

## Custom Titles

You can override the default title by adding text after the container type:

```markdown
::: warning Custom Warning Title
This warning has a custom title instead of the default "Warning".
:::
```

::: warning Custom Warning Title
This warning has a custom title instead of the default "Warning".
:::

```markdown
::: info Pro Tip
Use custom titles to make your callouts more specific and relevant.
:::
```

::: info Pro Tip
Use custom titles to make your callouts more specific and relevant.
:::

## Rich Content

Containers support all markdown features:

### Code Blocks

```markdown
::: error Build Failed
The TypeScript compilation failed:

\`\`\`typescript
const x: string = 123; // Type 'number' is not assignable to type 'string'
\`\`\`

Fix the type annotation or convert the value.
:::
```

::: error Build Failed
The TypeScript compilation failed:

```typescript
const x: string = 123; // Type 'number' is not assignable to type 'string'
```

Fix the type annotation or convert the value.
:::

### Lists and Links

```markdown
::: info Getting Started
To use containers, you need:

- markdown-it parser
- markdown-it-container plugin
- Custom CSS for styling

See the [plugin documentation](https://github.com/markdown-it/markdown-it-container) for more details.
:::
```

::: info Getting Started
To use containers, you need:

- markdown-it parser
- markdown-it-container plugin
- Custom CSS for styling

See the [plugin documentation](https://github.com/markdown-it/markdown-it-container) for more details.
:::

### Formatted Text

```markdown
::: success Deployment Complete
**Server**: Production
**Version**: v2.4.1
**Status**: ✅ All systems operational
**Uptime**: 99.99%

The deployment was *successful* and all health checks passed.
:::
```

::: success Deployment Complete
**Server**: Production
**Version**: v2.4.1
**Status**: ✅ All systems operational
**Uptime**: 99.99%

The deployment was *successful* and all health checks passed.
:::

## Nested Content

Containers can include complex nested structures:

```markdown
::: warning Security Advisory
### SQL Injection Risk

When building queries, **never** concatenate user input:

\`\`\`javascript
// ❌ Vulnerable
const query = "SELECT * FROM users WHERE id = " + userId;

// ✅ Secure
const query = "SELECT * FROM users WHERE id = ?";
db.execute(query, [userId]);
\`\`\`

**Impact**: High
**Severity**: Critical

> See [OWASP Top 10](https://owasp.org/www-project-top-ten/) for more security best practices.
:::
```

::: warning Security Advisory
### SQL Injection Risk

When building queries, **never** concatenate user input:

```javascript
// ❌ Vulnerable
const query = "SELECT * FROM users WHERE id = " + userId;

// ✅ Secure
const query = "SELECT * FROM users WHERE id = ?";
db.execute(query, [userId]);
```

**Impact**: High
**Severity**: Critical

> See [OWASP Top 10](https://owasp.org/www-project-top-ten/) for more security best practices.
:::

## Multiple Containers

You can use multiple containers in sequence:

```markdown
::: info Prerequisites
Make sure Node.js 18+ is installed.
:::

::: warning Common Issues
If installation fails, check your npm cache.
:::

::: success Next Steps
Run `npm start` to begin development.
:::
```

::: info Prerequisites
Make sure Node.js 18+ is installed.
:::

::: warning Common Issues
If installation fails, check your npm cache.
:::

::: success Next Steps
Run `npm start` to begin development.
:::

## Practical Examples

### API Documentation

```markdown
::: info GET /api/users
Returns a list of all users.

**Parameters**: None
**Authentication**: Required

\`\`\`json
{
  "users": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ]
}
\`\`\`
:::
```

::: info GET /api/users
Returns a list of all users.

**Parameters**: None
**Authentication**: Required

```json
{
  "users": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ]
}
```
:::

### Tutorial Steps

```markdown
::: note Step 1: Installation
Install the required packages:
\`\`\`bash
npm install markdown-it markdown-it-container
\`\`\`
:::

::: note Step 2: Configuration
Configure the plugin in your markdown-it instance.
:::

::: success Step 3: Done!
You're ready to use containers in your markdown!
:::
```

::: note Step 1: Installation
Install the required packages:
```bash
npm install markdown-it markdown-it-container
```
:::

::: note Step 2: Configuration
Configure the plugin in your markdown-it instance.
:::

::: success Step 3: Done!
You're ready to use containers in your markdown!
:::

### Release Notes

```markdown
::: success v2.1.0 Released
#### New Features
- Added dark mode support
- Improved search performance
- New keyboard shortcuts

#### Bug Fixes
- Fixed memory leak in file watcher
- Resolved syntax highlighting issues
:::

::: warning Breaking Changes
The configuration file format has changed. See [migration guide](./migration.md) for details.
:::
```

::: success v2.1.0 Released
#### New Features
- Added dark mode support
- Improved search performance
- New keyboard shortcuts

#### Bug Fixes
- Fixed memory leak in file watcher
- Resolved syntax highlighting issues
:::

::: warning Breaking Changes
The configuration file format has changed. See [migration guide](./migration.md) for details.
:::

## Theme Support

Containers automatically adapt to light and dark themes. The colors are carefully chosen to ensure readability in both modes:

### Light Theme
- Info: Blue background with darker blue title
- Warning: Yellow/orange background with darker orange title
- Error: Light red background with dark red title
- Success: Light green background with dark green title
- Note: Light purple background with dark purple title

### Dark Theme
- Info: Dark blue background with lighter blue title
- Warning: Dark orange background with lighter orange title
- Error: Dark red background with lighter red title
- Success: Dark green background with lighter green title
- Note: Dark purple background with lighter purple title

## Best Practices

✅ Use appropriate container types for content
✅ Keep containers focused on one topic
✅ Use custom titles for clarity
✅ Leverage markdown formatting inside containers
✅ Use containers sparingly for emphasis

❌ Don't nest containers inside containers
❌ Don't use containers for regular content
❌ Don't overuse - they lose impact
❌ Don't use error type for non-critical issues

## Syntax Reference

```markdown
::: type
Content here
:::

::: type Custom Title
Content with custom title
:::
```

**Available types**: `info`, `warning`, `error`, `success`, `note`

## Implementation

Containers are implemented using:
- **Parser**: markdown-it-container plugin
- **Styling**: Custom CSS in [MarkdownViewer.css](src/renderer/components/markdown/MarkdownViewer.css:584)
- **Theme Support**: Automatic via `data-theme` attribute

## Compatibility

Container syntax is supported by:
- ✅ **markdown-it (used by MarkRead)** - via `markdown-it-container` plugin
- ✅ VuePress
- ✅ VitePress
- ✅ Docusaurus (as "admonitions")
- ✅ MkDocs (as "admonitions")
- ❌ GitHub Flavored Markdown (not supported)
- ❌ CommonMark (not part of spec)

**Note**: The specific syntax (`::: type`) may vary across implementations. Some use different markers like `!!!` or `???`.

## See Also

- [Blockquotes](../text-formatting/blockquotes.md)
- [Code Blocks](../code/code-blocks.md)
- [Definition Lists](definition-lists.md)
