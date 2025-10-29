# Emoji Support

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Advanced](./) → Emoji

Emoji add visual expression to Markdown documents.

## Emoji Codes

Use `:emoji_code:` syntax:

```markdown
:smile: :heart: :rocket: :star: :fire:
```

Results: 😄 ❤️ 🚀 ⭐ 🔥

## Direct Unicode Emoji

You can also use emoji directly:

```markdown
😀 😃 😄 😁 😆 😅 🤣 😂
```

Results: 😀 😃 😄 😁 😆 😅 🤣 😂

## Common Emoji Categories

### Smileys & People

```markdown
:smile: :grin: :joy: :heart_eyes: :thinking:
:thumbsup: :thumbsdown: :clap: :wave: :raised_hands:
```

😄 😁 😂 😍 🤔 👍 👎 👏 👋 🙌

### Nature

```markdown
:sun: :moon: :star: :cloud: :fire:
:tree: :flower: :leaves: :herb: :seedling:
```

☀️ 🌙 ⭐ ☁️ 🔥 🌲 🌸 🍃 🌿 🌱

### Objects

```markdown
:computer: :keyboard: :mouse: :printer: :phone:
:book: :pencil: :memo: :file_folder: :open_file_folder:
```

💻 ⌨️ 🖱️ 🖨️ 📱 📖 ✏️ 📝 📁 📂

### Symbols

```markdown
:heart: :star: :check: :x: :warning:
:info: :question: :exclamation: :arrow_right: :arrow_left:
```

❤️ ⭐ ✔️ ❌ ⚠️ ℹ️ ❓ ❗ ➡️ ⬅️

### Development & Tech

```markdown
:rocket: :bug: :gear: :hammer: :wrench:
:package: :lock: :unlock: :key: :mag:
```

🚀 🐛 ⚙️ 🔨 🔧 📦 🔒 🔓 🔑 🔍

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

✅ Use sparingly for visual impact
✅ Consistent usage across docs
✅ Consider accessibility (screen readers)
✅ Use meaningful emoji

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

- ✅ GitHub Flavored Markdown
- ✅ Markdig (with Emoji extension)
- ✅ Many other processors
- ❌ CommonMark (core spec)

### Direct Unicode Emoji

- ✅ All Markdown processors
- ✅ Universal support
- Rendering depends on OS/browser

## Configuration in MarkRead

MarkRead supports emoji through Markdig's Emoji extension:

```csharp
var pipeline = new MarkdownPipelineBuilder()
    .UseEmojiAndSmiley()
    .Build();
```

## See Also

- [Text Formatting](../text-formatting/emphasis.md)
- [Special Characters](html-in-markdown.md)
