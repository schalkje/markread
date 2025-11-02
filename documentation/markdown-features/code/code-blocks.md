# Code Blocks

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Code](./) → Code Blocks

Code blocks display multi-line code with syntax highlighting and formatting.

## Basic Code Blocks

### Fenced Code Blocks

Use triple backticks:

````markdown
```
function hello() {
    console.log("Hello, World!");
}
```
````

Results in:

```
function hello() {
    console.log("Hello, World!");
}
```

### Indented Code Blocks

Indent four spaces:

```markdown
    function hello() {
        console.log("Hello, World!");
    }
```

**Note**: Fenced code blocks are preferred because they support syntax highlighting.

## Syntax Highlighting

Specify the language after opening backticks:

````markdown
```python
def calculate_sum(a, b):
    """Calculate sum of two numbers."""
    return a + b

result = calculate_sum(10, 20)
print(f"Result: {result}")
```
````

Results in:

```python
def calculate_sum(a, b):
    """Calculate sum of two numbers."""
    return a + b

result = calculate_sum(10, 20)
print(f"Result: {result}")
```

## Supported Languages

MarkRead supports syntax highlighting for many languages:

### Common Languages

- **Python** - `python`, `py`
- **JavaScript** - `javascript`, `js`
- **TypeScript** - `typescript`, `ts`
- **C#** - `csharp`, `cs`
- **Java** - `java`
- **C/C++** - `c`, `cpp`
- **SQL** - `sql`
- **YAML** - `yaml`, `yml`
- **JSON** - `json`
- **XML** - `xml`
- **HTML** - `html`
- **CSS** - `css`

### Shell and Scripts

- **Bash** - `bash`, `sh`
- **PowerShell** - `powershell`, `ps1`
- **Batch** - `batch`, `bat`
- **Python** - `python`

### Web Technologies

- **JavaScript** - `javascript`, `js`
- **TypeScript** - `typescript`, `ts`
- **React JSX** - `jsx`, `tsx`
- **Vue** - `vue`
- **HTML** - `html`
- **CSS/SCSS** - `css`, `scss`, `sass`

### Data Formats

- **JSON** - `json`
- **YAML** - `yaml`, `yml`
- **XML** - `xml`
- **TOML** - `toml`
- **CSV** - `csv`
- **Markdown** - `markdown`, `md`

### Configuration

- **Dockerfile** - `dockerfile`
- **NGINX** - `nginx`
- **Apache** - `apache`
- **Git Config** - `gitconfig`

See individual language pages for detailed examples:
- [Python Syntax](python-syntax.md)
- [SQL Syntax](sql-syntax.md)
- [YAML Syntax](yaml-syntax.md)
- [C# Syntax](csharp-syntax.md)
- [JavaScript Syntax](javascript-syntax.md)

## Line Numbers

Some themes display line numbers automatically for code blocks over a certain length.

## Line Highlighting

Highlight specific lines (future feature):

````markdown
```python{2,4-6}
def example():
    # This line highlighted
    x = 10
    # Lines 4-6 highlighted
    y = 20
    z = 30
    return x + y + z
```
````

## Code Block with Title

Add a title/filename comment:

````markdown
```python
# filename: calculator.py
def add(a, b):
    return a + b
```
````

Results in:

```python
# filename: calculator.py
def add(a, b):
    return a + b
```

## Long Code Blocks

Long code blocks are scrollable:

```python
def very_long_function_with_many_parameters(
    parameter_one,
    parameter_two,
    parameter_three,
    parameter_four,
    parameter_five,
    parameter_six,
    parameter_seven,
    parameter_eight
):
    """
    This is a very long function with many parameters
    to demonstrate how long code blocks are handled.
    """
    result = (
        parameter_one +
        parameter_two +
        parameter_three +
        parameter_four +
        parameter_five +
        parameter_six +
        parameter_seven +
        parameter_eight
    )
    
    # Process each parameter
    for param in [
        parameter_one, parameter_two, parameter_three,
        parameter_four, parameter_five, parameter_six,
        parameter_seven, parameter_eight
    ]:
        print(f"Processing: {param}")
    
    return result
```

## Code Block Best Practices

### Always Specify Language

```markdown
✓ Good:
```python
print("Hello")
```

✗ Less good:
```
print("Hello")
```
(no syntax highlighting)
```

### Proper Indentation

Maintain proper code indentation:

```python
# Correct indentation
def hello():
    if True:
        print("Hello")
        
# Not this:
def hello():
if True:
print("Hello")
```

### Comments for Clarity

Add comments to explain complex code:

```python
# Initialize connection pool with retry logic
pool = ConnectionPool(
    max_connections=10,
    retry_attempts=3,  # Retry 3 times before failing
    timeout=30         # 30 second timeout
)
```

### Show Complete Examples

Provide runnable, complete examples:

```python
# Complete example - can be copied and run
import os

def read_config(filename):
    """Read configuration from file."""
    with open(filename, 'r') as f:
        return f.read()

if __name__ == "__main__":
    config = read_config("config.txt")
    print(config)
```

## Escaping Code Blocks

To show code block syntax in markdown, use quadruple backticks or indent:

`````markdown
````markdown
```python
print("This is shown, not executed")
```
````
`````

## Multiple Code Blocks

Show multiple related code blocks:

**Python:**
```python
def greet(name):
    return f"Hello, {name}!"
```

**JavaScript:**
```javascript
function greet(name) {
    return `Hello, ${name}!`;
}
```

**C#:**
```csharp
string Greet(string name)
{
    return $"Hello, {name}!";
}
```

## Interactive Features

In MarkRead, code blocks provide:
- **Copy button** - Hover to reveal copy button
- **Syntax highlighting** - Automatic color coding
- **Horizontal scroll** - For long lines
- **Font** - Monospace font for readability

## See Also

- [Inline Code](inline-code.md) - Code within text
- [Python Syntax](python-syntax.md) - Python examples
- [JavaScript Syntax](javascript-syntax.md) - JavaScript examples
- [SQL Syntax](sql-syntax.md) - SQL examples
