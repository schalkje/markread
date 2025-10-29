# JSON Syntax Highlighting

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Code](./) → JSON Syntax

MarkRead provides syntax highlighting for JSON configuration files.

## Basic JSON Structure

```json
{
    "name": "MarkRead",
    "version": "1.0.0",
    "description": "Modern Markdown viewer for Windows"
}
```

## Data Types

```json
{
    "string": "text value",
    "number": 42,
    "float": 3.14,
    "boolean": true,
    "null": null,
    "array": [1, 2, 3, 4, 5],
    "object": {
        "nested": "value"
    }
}
```

## Configuration Example

```json
{
    "app": {
        "name": "MarkRead",
        "version": "1.0.0"
    },
    "theme": {
        "mode": "dark",
        "accentColor": "#007ACC"
    },
    "editor": {
        "fontSize": 14,
        "fontFamily": "Consolas",
        "lineHeight": 1.6,
        "wordWrap": true
    },
    "search": {
        "caseSensitive": false,
        "regex": false,
        "maxResults": 100
    }
}
```

## Array of Objects

```json
{
    "documents": [
        {
            "id": 1,
            "title": "Getting Started",
            "path": "/docs/getting-started.md",
            "tags": ["guide", "tutorial"]
        },
        {
            "id": 2,
            "title": "Advanced Features",
            "path": "/docs/advanced.md",
            "tags": ["guide", "advanced"]
        }
    ]
}
```

## Settings Schema

```json
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "MarkRead Settings",
    "type": "object",
    "properties": {
        "appearance": {
            "type": "object",
            "properties": {
                "theme": {
                    "type": "string",
                    "enum": ["light", "dark", "auto"],
                    "default": "auto"
                },
                "fontSize": {
                    "type": "number",
                    "minimum": 8,
                    "maximum": 32,
                    "default": 14
                }
            }
        },
        "behavior": {
            "type": "object",
            "properties": {
                "autoReload": {
                    "type": "boolean",
                    "default": true
                },
                "preserveTabs": {
                    "type": "boolean",
                    "default": true
                }
            }
        }
    }
}
```

## Package.json Example

```json
{
    "name": "markread-docs",
    "version": "1.0.0",
    "description": "Documentation for MarkRead",
    "scripts": {
        "build": "vite build",
        "dev": "vite",
        "preview": "vite preview"
    },
    "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
    },
    "devDependencies": {
        "vite": "^4.3.0",
        "@types/react": "^18.2.0",
        "typescript": "^5.0.0"
    }
}
```

## JSON with Comments (JSONC)

While standard JSON doesn't support comments, JSONC does:

```jsonc
{
    // Application settings
    "app": {
        "name": "MarkRead",
        "version": "1.0.0"  // Current version
    },
    
    /* Theme configuration */
    "theme": {
        "mode": "dark"  // Options: light, dark, auto
    }
}
```

## Pretty Printing

```json
{
  "compact": false,
  "indentation": 2,
  "sortKeys": true,
  "trailingComma": false
}
```

## Highlighted Features

MarkRead highlights:
- **Keys**: Property names in quotes
- **Strings**: Text values
- **Numbers**: Integers and floats
- **Booleans**: `true`, `false`
- **Null**: `null` values
- **Structure**: Braces, brackets, colons, commas

## Common JSON Files

- `package.json` - Node.js packages
- `settings.json` - VS Code/app settings
- `tsconfig.json` - TypeScript configuration
- `launch.json` - Debug configurations
- `.markread/settings.json` - MarkRead settings

## See Also

- [Code Blocks](code-blocks.md)
- [YAML Syntax](yaml-syntax.md)
- [Configuration Reference](../../reference/configuration.md)
