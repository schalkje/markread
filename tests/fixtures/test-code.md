# Syntax Highlighting Test

## JavaScript
```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
console.log(fibonacci(10));
```

## Python
```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
```

## TypeScript
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' }
];
```

## Rust
```rust
fn main() {
    let mut vec = vec![1, 2, 3];
    vec.push(4);
    println!("Vector: {:?}", vec);
}
```

## Go
```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```
