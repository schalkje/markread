# YAML Syntax Highlighting

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Code](./) → YAML Syntax

MarkRead provides syntax highlighting for YAML configuration files.

## Basic YAML Structure

```yaml
name: MarkRead
version: 1.0.0
description: Modern Markdown viewer for Windows
```

## Data Types

```yaml
# Strings
string1: plain text
string2: "quoted text"
string3: 'single quoted'
multiline: |
  This is a
  multiline string

# Numbers
integer: 42
float: 3.14
exponential: 1.2e3

# Booleans
enabled: true
disabled: false

# Null
value: null
empty: ~
```

## Collections

### Lists

```yaml
# Inline list
tags: [guide, tutorial, markdown]

# Block list
languages:
  - C#
  - Python
  - JavaScript
  - TypeScript

# Nested lists
features:
  - name: Tabs
    items:
      - Multiple documents
      - Drag to reorder
      - Pin favorites
  - name: Search
    items:
      - Full-text search
      - Regex support
      - Case sensitive
```

### Objects

```yaml
# Nested objects
app:
  name: MarkRead
  version: 1.0.0
  settings:
    theme: dark
    fontSize: 14
    
theme:
  light:
    background: "#FFFFFF"
    text: "#000000"
  dark:
    background: "#1E1E1E"
    text: "#D4D4D4"
```

## GitHub Actions Workflow

```yaml
name: Build and Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'
      
      - name: Restore dependencies
        run: dotnet restore
      
      - name: Build
        run: dotnet build --no-restore --configuration Release
      
      - name: Test
        run: dotnet test --no-build --verbosity normal
```

## Docker Compose

```yaml
version: '3.8'

services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./docs:/usr/share/nginx/html
    environment:
      - NGINX_HOST=localhost
      - NGINX_PORT=80
    
  docs:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      - web
```

## Configuration File

```yaml
# Application Settings
application:
  name: MarkRead
  version: 1.0.0
  
  # Window settings
  window:
    width: 1200
    height: 800
    maximized: false
    
  # Rendering options
  rendering:
    enableCodeHighlight: true
    enableMermaid: true
    codeTheme: vs-dark
    
# User preferences
preferences:
  theme: auto  # light, dark, auto
  fontSize: 14
  fontFamily: Segoe UI
  
  # Search settings
  search:
    caseSensitive: false
    wholeWord: false
    regex: false
    
  # Behavior
  behavior:
    autoReload: true
    preserveTabs: true
    confirmClose: true

# Keyboard shortcuts
shortcuts:
  open: Ctrl+O
  save: Ctrl+S
  find: Ctrl+F
  newTab: Ctrl+T
  closeTab: Ctrl+W
```

## Anchors and References

```yaml
# Define anchor
defaults: &defaults
  timeout: 30
  retries: 3
  logLevel: info

# Reference anchor
production:
  <<: *defaults
  environment: prod
  
development:
  <<: *defaults
  environment: dev
  logLevel: debug
```

## Highlighted Features

MarkRead highlights:
- **Keys**: Property names
- **Strings**: Plain, quoted, multiline
- **Numbers**: Integers, floats
- **Booleans**: `true`, `false`
- **Null**: `null`, `~`
- **Lists**: Dash items, inline arrays
- **Anchors**: `&anchor`, `*reference`
- **Comments**: `# Comment text`

## Common YAML Files

- `.github/workflows/*.yml` - GitHub Actions
- `docker-compose.yml` - Docker configuration
- `config.yml` - Application configuration
- `.markread.yml` - MarkRead settings (if supported)

## See Also

- [Code Blocks](code-blocks.md)
- [JSON Syntax](json-syntax.md)
- [Configuration Reference](../../reference/configuration.md)
