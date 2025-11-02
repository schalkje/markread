# Prism.js Integration

This directory contains Prism.js syntax highlighting for MarkRead.

## Features

- **Automatic syntax highlighting** for 200+ languages
- **Line numbers** on all code blocks
- **Copy to clipboard** button via toolbar
- **Theme-aware** - automatically switches between light and dark themes
- **Autoloader** - automatically loads language definitions as needed

## Files

- `prism-core.min.js` - Core Prism.js library
- `prism-autoloader.min.js` - Automatic language loading
- `prism-config.js` - Configuration for autoloader CDN path
- `prism-line-numbers.min.js` - Line numbers plugin
- `prism-toolbar.min.js` - Toolbar plugin (required for copy button)
- `prism-copy-to-clipboard.min.js` - Copy to clipboard plugin
- `themes/theme-aware.css` - Theme-aware styles (light/dark)

## Supported Languages

Prism.js supports 200+ languages including:

- C#
- JavaScript/TypeScript
- Python
- PowerShell
- JSON/YAML
- Markdown
- CSS/SCSS
- SQL
- And many more...

Languages are loaded automatically via the autoloader plugin when needed.

## Usage in Markdown

Simply use fenced code blocks with language identifiers:

\`\`\`csharp
public class Example
{
    public string Name { get; set; }
}
\`\`\`

The autoloader will:
1. Detect the language from the class name (e.g., `language-csharp`)
2. Fetch the appropriate language definition from CDN
3. Apply syntax highlighting automatically

Line numbers and copy button are added automatically to all code blocks.

## Theme Support

The CSS automatically switches between light and dark themes based on the `[data-theme]` attribute:

- **Light theme**: Clean, readable syntax colors on light background
- **Dark theme**: Eye-friendly Tomorrow Night color scheme

## License

Prism.js is licensed under the MIT License. See LICENSE file for details.

Website: https://prismjs.com/
GitHub: https://github.com/PrismJS/prism/
