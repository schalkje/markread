# Contributing to MarkRead

> 📍 **Navigation**: [Home](../../README.md) → [Documentation](../README.md) → [Developer](.) → Contributing

Thank you for your interest in contributing to MarkRead! This guide will help you get started.

## Ways to Contribute

- 🐛 **Report bugs** - Help us find and fix issues
- 💡 **Suggest features** - Share ideas for improvements
- 📝 **Improve documentation** - Help others understand MarkRead
- 💻 **Submit code** - Fix bugs or implement features
- 🌍 **Translate** - Help localize MarkRead

## Getting Started

### 1. Fork the Repository

```bash
# Fork on GitHub, then clone
git clone https://github.com/YOUR-USERNAME/markread.git
cd markread
```

### 2. Set Up Development Environment

```powershell
# Install .NET 8 SDK
# Download from: https://dotnet.microsoft.com/download/dotnet/8.0

# Restore dependencies
dotnet restore

# Build the solution
dotnet build

# Run the application
dotnet run --project src/App/MarkRead.App.csproj
```

See [Getting Started](getting-started.md) for detailed setup.

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

Follow our [Coding Standards](coding-standards.md).

### 3. Test Your Changes

```powershell
# Run unit tests
dotnet test tests/unit/MarkRead.UnitTests.csproj

# Run integration tests
dotnet test tests/integration/MarkRead.IntegrationTests.csproj
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature"
# or
git commit -m "fix: resolve issue with..."
```

**Commit Message Format**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a pull request on GitHub.

## Pull Request Guidelines

### PR Checklist

- [ ] Code follows [coding standards](coding-standards.md)
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No unnecessary dependencies added
- [ ] Commit messages follow convention
- [ ] PR description explains changes

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
```

## Code Review Process

1. **Automated Checks** - CI runs tests and linting
2. **Maintainer Review** - Code review by maintainers
3. **Feedback** - Address review comments
4. **Approval** - Once approved, PR is merged

## Development Guidelines

### Coding Standards

- Follow C# conventions
- Use meaningful variable names
- Add XML documentation comments
- Keep methods small and focused
- Write unit tests for new code

See [Coding Standards](coding-standards.md) for details.

### Testing

- Write unit tests for business logic
- Add integration tests for workflows
- Maintain test coverage > 80%
- Test edge cases and error handling

See [Testing Guide](testing.md) for details.

### Documentation

- Update relevant docs with code changes
- Add XML comments to public APIs
- Include examples for new features
- Keep README and guides up-to-date

## Reporting Bugs

### Before Reporting

1. Check [existing issues](https://github.com/schalkje/markread/issues)
2. Try latest version
3. Gather diagnostic information

### Bug Report Template

```markdown
**Describe the bug**
Clear description of the issue

**To Reproduce**
Steps to reproduce:
1. Open folder...
2. Click on...
3. See error...

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable

**Environment:**
- OS: Windows 11
- MarkRead Version: 1.0.0
- .NET Version: 8.0.x

**Additional context**
Any other relevant information
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other solutions you thought about

**Additional context**
Mockups, examples, etc.
```

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Give constructive feedback
- Focus on the issue, not the person

### Getting Help

- **Discussions** - Ask questions on GitHub Discussions
- **Issues** - Report bugs or request features
- **Documentation** - Check existing docs first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- About dialog in application

Thank you for contributing to MarkRead! 🎉

## See Also

- [Getting Started](getting-started.md) - Development setup
- [Coding Standards](coding-standards.md) - Code style guide
- [Testing Guide](testing.md) - Testing practices
- [Build Process](build-process.md) - Building and packaging
