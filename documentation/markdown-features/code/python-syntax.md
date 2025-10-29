# Python Syntax Highlighting

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Code](./) → Python Syntax

MarkRead provides rich syntax highlighting for Python code.

## Basic Python Example

```python
def greet(name):
    """Greet a person by name."""
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("World"))
```

## Classes and Methods

```python
class MarkdownParser:
    """Parse and render Markdown content."""
    
    def __init__(self, options=None):
        self.options = options or {}
        self.extensions = []
    
    def parse(self, content):
        """Parse markdown content to HTML."""
        return self._render(content)
    
    @staticmethod
    def _render(content):
        # Rendering logic
        return f"<p>{content}</p>"
```

## Data Types and Operations

```python
# Numbers
integer = 42
floating = 3.14
complex_num = 3 + 4j

# Strings
single_quote = 'text'
double_quote = "text"
multi_line = """
Multiple
lines
"""

# Collections
my_list = [1, 2, 3, 4, 5]
my_tuple = (1, 2, 3)
my_dict = {"key": "value", "number": 42}
my_set = {1, 2, 3, 4}

# List comprehension
squares = [x**2 for x in range(10)]
```

## Control Flow

```python
# Conditional statements
if score >= 90:
    grade = 'A'
elif score >= 80:
    grade = 'B'
else:
    grade = 'C'

# Loops
for i in range(5):
    print(i)

while condition:
    do_something()

# Exception handling
try:
    risky_operation()
except ValueError as e:
    print(f"Error: {e}")
except Exception:
    print("Unknown error")
finally:
    cleanup()
```

## Async/Await

```python
import asyncio

async def fetch_data(url):
    """Fetch data asynchronously."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

async def main():
    tasks = [fetch_data(url) for url in urls]
    results = await asyncio.gather(*tasks)
    return results

asyncio.run(main())
```

## Decorators

```python
from functools import wraps
import time

def timing_decorator(func):
    """Measure function execution time."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.2f}s")
        return result
    return wrapper

@timing_decorator
def slow_function():
    time.sleep(1)
    return "Done"
```

## Type Hints

```python
from typing import List, Dict, Optional, Union

def process_items(
    items: List[str],
    config: Dict[str, int],
    timeout: Optional[float] = None
) -> Union[List[str], None]:
    """Process items with configuration."""
    if not items:
        return None
    
    result: List[str] = []
    for item in items:
        result.append(item.upper())
    
    return result
```

## Highlighted Features

MarkRead highlights:
- **Keywords**: `def`, `class`, `if`, `for`, `async`, etc.
- **Built-ins**: `print()`, `len()`, `range()`, etc.
- **Strings**: Single, double, and multi-line
- **Comments**: `# Single line` and `""" Docstrings """`
- **Numbers**: Integers, floats, complex
- **Decorators**: `@decorator`
- **Magic methods**: `__init__`, `__str__`, etc.

## See Also

- [Code Blocks](code-blocks.md)
- [C# Syntax](csharp-syntax.md)
- [JavaScript Syntax](javascript-syntax.md)
- [Inline Code](inline-code.md)
