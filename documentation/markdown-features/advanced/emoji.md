# Emoji Support

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Advanced](./) → Emoji

> ⚠️ **PARTIALLY SUPPORTED** - Emoji shortcodes (`:smile:`) are **not supported** in MarkRead (requires `markdown-it-emoji` plugin). However, **Unicode emoji** work perfectly - just paste them directly in your markdown!

Emoji add visual expression to Markdown documents.

## Emoji Codes (NOT SUPPORTED)

The `:emoji_code:` syntax is **not supported**:

```markdown
:smile: :heart: :rocket: :star: :fire:
```

This will **NOT** render as emoji in MarkRead.

## Direct Unicode Emoji ✅ SUPPORTED

You should use Unicode emoji directly (this works perfectly):

```markdown
😀 😃 😄 😁 😆 😅 🤣 😂
```

Results: 😀 😃 😄 😁 😆 😅 🤣 😂

## Common Emoji Categories

### Smileys & People

```markdown
😄 😁 😂 😍 🤔 👍 👎 👏 👋 🙌
```

Results: 😄 😁 😂 😍 🤔 👍 👎 👏 👋 🙌

### Nature

```markdown
☀️ 🌙 ⭐ ☁️ 🔥 🌲 🌸 🍃 🌿 🌱
```

Results: ☀️ 🌙 ⭐ ☁️ 🔥 🌲 🌸 🍃 🌿 🌱

### Objects

```markdown
💻 ⌨️ 🖱️ 🖨️ 📱 📖 ✏️ 📝 📁 📂
```

Results: 💻 ⌨️ 🖱️ 🖨️ 📱 📖 ✏️ 📝 📁 📂

### Symbols

```markdown
❤️ ⭐ ✔️ ❌ ⚠️ ℹ️ ❓ ❗ ➡️ ⬅️
```

Results: ❤️ ⭐ ✔️ ❌ ⚠️ ℹ️ ❓ ❗ ➡️ ⬅️

### Development & Tech

```markdown
🚀 🐛 ⚙️ 🔨 🔧 📦 🔒 🔓 🔑 🔍
```

Results: 🚀 🐛 ⚙️ 🔨 🔧 📦 🔒 🔓 🔑 🔍

## Emoji in Context

### Status Indicators

```markdown
✅ Completed
⚠️ Warning
❌ Error
🔄 In Progress
⏸️ Paused
```

### Feature Lists

```markdown
Features:
- 📝 Markdown editing
- 🎨 Theme support
- 🔍 Full-text search
- 📁 File navigation
- ⌨️ Keyboard shortcuts
```

### Documentation Navigation

```markdown
📍 Current location
🏠 Home
📖 Documentation
💡 Tips & Tricks
❓ FAQ
```

## Emoji in Headers

```markdown
## 🚀 Getting Started
## 🔧 Configuration
## 📚 Reference
## 🐛 Troubleshooting
```

## Emoji in Tables

```markdown
| Status | Emoji | Meaning |
|--------|-------|---------|
| Success | ✅ | Completed |
| Warning | ⚠️ | Attention needed |
| Error | ❌ | Failed |
| Info | ℹ️ | Information |
```

| Status | Emoji | Meaning |
|--------|-------|---------|
| Success | ✅ | Completed |
| Warning | ⚠️ | Attention needed |
| Error | ❌ | Failed |
| Info | ℹ️ | Information |

## Emoji Resources

**Find emoji codes:**
- [Emojipedia](https://emojipedia.org/)
- [GitHub Emoji Cheat Sheet](https://github.com/ikatyang/emoji-cheat-sheet)
- [Unicode Emoji List](https://unicode.org/emoji/charts/full-emoji-list.html)

## Browser Support

All modern browsers support Unicode emoji:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Opera

Rendering may vary by platform:
- Windows emoji vs macOS emoji
- Different styles and colors

## Best Practices

✅ Use **Unicode emoji** directly (paste from emoji picker)
✅ Use sparingly for visual impact
✅ Consistent usage across docs
✅ Consider accessibility (screen readers)
✅ Use meaningful emoji

❌ Don't use emoji shortcodes (`:smile:`) - not supported
❌ Don't overuse - reduces readability
❌ Don't use instead of text
❌ Don't assume all platforms render same

## Accessibility Note

Emoji can affect screen readers. Consider:

```markdown
<!-- Good: Emoji as decoration -->
🚀 Getting Started

<!-- Better: With context -->
Getting Started (🚀)

<!-- Best: Text is primary -->
Getting Started
```

## Compatibility

### Emoji Codes (`:smile:`)

- ❌ **markdown-it (used by MarkRead)** - requires `markdown-it-emoji` plugin
- ✅ GitHub Flavored Markdown
- ✅ Markdig (with Emoji extension)
- ✅ Many other processors
- ❌ CommonMark (core spec)

### Direct Unicode Emoji ✅ RECOMMENDED

- ✅ **markdown-it (used by MarkRead)** - fully supported
- ✅ All Markdown processors
- ✅ Universal support
- Rendering depends on OS/browser

## How to Insert Unicode Emoji

**Windows:**
- Press `Win + .` (period) to open emoji picker
- Or press `Win + ;` (semicolon)

**macOS:**
- Press `Cmd + Control + Space`

**Copy from websites:**
- [Emojipedia](https://emojipedia.org/)
- [Unicode Emoji List](https://unicode.org/emoji/charts/full-emoji-list.html)

## See Also

- [Text Formatting](../text-formatting/emphasis.md)
- [Special Characters](html-in-markdown.md)
