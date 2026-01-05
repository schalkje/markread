# Developer Documentation

Welcome to the MarkRead developer documentation. This guide will help you understand the codebase, contribute to the project, and build new features.

## Table of Contents

### Getting Started
- [Getting Started](getting-started.md) - Development environment setup and first steps
- [Contributing](contributing.md) - Guidelines for contributing to MarkRead
- [Coding Standards](coding-standards.md) - Code style and best practices

### Architecture & Design
- [Architecture Overview](architecture/) - System architecture and design decisions
  - [IPC Pattern Decision](architecture/IPC_PATTERN_DECISION.md) - Secure IPC pattern for Git operations
  - [IPC Implementation Examples](architecture/IPC_IMPLEMENTATION_EXAMPLES.md) - Practical IPC examples
  - [IPC Quick Reference](architecture/IPC_QUICK_REFERENCE.md) - Quick reference guide
  - [Caching Decision](architecture/CACHING_DECISION.md) - File caching strategy
  - [Cache Recommendation](architecture/CACHE_RECOMMENDATION.md) - Cache implementation guidelines
  - [Network Connectivity](architecture/NETWORK_CONNECTIVITY_INDEX.md) - Network connectivity research and design
  - [Research Index](architecture/RESEARCH_INDEX.md) - Technical research documents

### Build & Release
- [Build Process](build-process.md) - Building the application from source
- [Testing](testing.md) - Running tests and test guidelines
- [Release Process](release-process.md) - Creating and publishing releases
- [Version Management](version-management.md) - Versioning strategy and changelog
- [Release Best Practices](release-best-practices.md) - Best practices for releases
- [Release Automation Comparison](release-automation-comparison.md) - Comparison of automation tools

### Deployment & Distribution
- [Deployment](deployment.md) - Deployment strategies and guidelines
- [Distribution Plan](distribution-plan.md) - Application distribution planning
- [MSI Setup](msi-setup.md) - Creating Windows MSI installers

### Security & Signing
- [Security Best Practices](security-best-practices.md) - Security guidelines
- [Certificate Management](certificate-management.md) - Managing code signing certificates
- [SignPath Setup](signpath-setup.md) - Setting up SignPath.io for code signing
- [SignPath Quickstart](signpath-quickstart.md) - Quick start guide for SignPath
- [SignPath Workflow](signpath-workflow-diagram.md) - SignPath workflow diagram
- [SignPath Integration](SIGNPATH-INTEGRATION.md) - Summary of SignPath integration
- [Local Signing Guide](local-signing-guide.md) - Signing locally for development

### Implementation Guides
- [Implementation Guide](IMPLEMENTATION_GUIDE.md) - Electron redesign implementation guide
- [OAuth Setup](OAUTH_SETUP.md) - OAuth configuration and setup
- [MSI Quickstart](QUICKSTART-MSI.md) - Quick guide to MSI packaging

### CI/CD
- [GitHub Actions Workflow](github-actions-workflow.md) - CI/CD pipeline documentation
- [Version Update Checklist](VERSION-UPDATE-CHECKLIST.md) - Checklist for version updates

## Technology Stack

MarkRead is built with:

- **Electron 33.4** - Cross-platform desktop framework
- **React 18.3** - UI component library
- **TypeScript 5.7** - Type-safe JavaScript
- **Zustand 4.5** - State management
- **markdown-it 14.1** - Markdown processor
- **Highlight.js 11.11** - Syntax highlighting
- **Mermaid 11.12** - Diagram rendering
- **Chokidar 5.0** - File system watching

## Project Structure

```
markread/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React UI components
│   ├── preload/        # Preload scripts
│   └── shared/         # Shared types and utilities
├── tests/              # Test suites
├── documentation/      # Documentation
│   ├── developer/      # Developer docs (you are here)
│   └── user-guide/     # User documentation
└── dist/               # Build output
```

## Quick Commands

```bash
# Development
npm install             # Install dependencies
npm run dev            # Run in development mode
npm run lint           # Run linter
npm test               # Run tests

# Building
npm run build          # Build the application
npm run build:win      # Build Windows installer

# Type checking
npm run type-check     # Run TypeScript type checker
```

## Key Concepts

### IPC Communication
MarkRead uses a secure contextBridge pattern for IPC between the main and renderer processes. See [IPC Pattern Decision](architecture/IPC_PATTERN_DECISION.md) for details.

### State Management
Zustand is used for global state management. State is organized by feature (tabs, files, settings, etc.).

### Markdown Rendering
The application uses markdown-it for parsing and rendering markdown, with plugins for:
- GitHub Flavored Markdown
- Syntax highlighting (Highlight.js)
- Diagram rendering (Mermaid)
- Task lists, tables, and more

### File Watching
Chokidar monitors the file system for changes and triggers updates in real-time.

## Contributing

We welcome contributions! Please read our [Contributing Guide](contributing.md) for:
- Code of conduct
- Development workflow
- Pull request process
- Code review guidelines

## Getting Help

- Check the [User Guide](../user-guide/) for general usage questions
- Review [Architecture Documentation](architecture/) for design decisions
- See [Getting Started](getting-started.md) for development setup
- Open an issue on [GitHub](https://github.com/schalkje/markread/issues)

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
