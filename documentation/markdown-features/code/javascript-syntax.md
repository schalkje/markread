# JavaScript Syntax Highlighting

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Code](./) → JavaScript Syntax

MarkRead provides rich syntax highlighting for JavaScript and TypeScript code.

## Basic JavaScript

```javascript
function greet(name) {
    return `Hello, ${name}!`;
}

const message = greet('World');
console.log(message);
```

## Modern ES6+ Features

```javascript
// Arrow functions
const add = (a, b) => a + b;
const multiply = (x, y) => {
    return x * y;
};

// Destructuring
const { title, content } = document;
const [first, second, ...rest] = items;

// Spread operator
const merged = { ...defaults, ...options };
const combined = [...array1, ...array2];

// Template literals
const html = `
    <div class="card">
        <h2>${title}</h2>
        <p>${content}</p>
    </div>
`;
```

## Classes and Modules

```javascript
export class MarkdownParser {
    constructor(options = {}) {
        this.options = options;
        this.plugins = [];
    }
    
    parse(content) {
        return this.render(content);
    }
    
    static fromConfig(config) {
        return new MarkdownParser(config);
    }
}

// Import/Export
import { MarkdownParser } from './parser.js';
export { MarkdownParser };
export default MarkdownParser;
```

## Async/Await

```javascript
async function fetchMarkdown(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const content = await response.text();
        return content;
    } catch (error) {
        console.error('Failed to fetch:', error);
        throw error;
    }
}

// Promise.all
const results = await Promise.all([
    fetchMarkdown('doc1.md'),
    fetchMarkdown('doc2.md'),
    fetchMarkdown('doc3.md')
]);
```

## React/JSX

```javascript
import React, { useState, useEffect } from 'react';

function MarkdownViewer({ filePath }) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function loadContent() {
            try {
                const text = await fetchMarkdown(filePath);
                setContent(text);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        
        loadContent();
    }, [filePath]);
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    return (
        <div className="markdown-viewer">
            <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
    );
}

export default MarkdownViewer;
```

## Array Methods

```javascript
const numbers = [1, 2, 3, 4, 5];

// Map
const doubled = numbers.map(n => n * 2);

// Filter
const evens = numbers.filter(n => n % 2 === 0);

// Reduce
const sum = numbers.reduce((acc, n) => acc + n, 0);

// Find
const found = numbers.find(n => n > 3);

// Chain methods
const result = numbers
    .filter(n => n % 2 === 0)
    .map(n => n * 2)
    .reduce((acc, n) => acc + n, 0);
```

## Object Methods

```javascript
const obj = {
    name: 'Document',
    type: 'markdown',
    size: 1024
};

// Keys, values, entries
const keys = Object.keys(obj);
const values = Object.values(obj);
const entries = Object.entries(obj);

// Iteration
for (const [key, value] of Object.entries(obj)) {
    console.log(`${key}: ${value}`);
}

// Destructuring in parameters
function printDoc({ name, type, size = 0 }) {
    console.log(`${name} (${type}): ${size} bytes`);
}
```

## TypeScript

```typescript
interface Document {
    id: number;
    title: string;
    content: string;
    createdAt: Date;
    tags?: string[];
}

type Status = 'draft' | 'published' | 'archived';

class DocumentService {
    private documents: Map<number, Document> = new Map();
    
    getDocument(id: number): Document | undefined {
        return this.documents.get(id);
    }
    
    addDocument(doc: Document): void {
        this.documents.set(doc.id, doc);
    }
    
    filterByStatus<T extends Document>(
        status: Status
    ): T[] {
        // Implementation
        return [] as T[];
    }
}
```

## Highlighted Features

MarkRead highlights:
- **Keywords**: `function`, `class`, `const`, `let`, `async`, `await`
- **Built-ins**: `console`, `Math`, `Array`, `Object`
- **Operators**: `=>`, `...`, `?.`, `??`
- **JSX**: Tags, attributes, expressions
- **Types** (TypeScript): `string`, `number`, `boolean`, interfaces
- **Template literals**: Backticks and interpolations

## See Also

- [Code Blocks](code-blocks.md)
- [Python Syntax](python-syntax.md)
- [C# Syntax](csharp-syntax.md)
- [JSON Syntax](json-syntax.md)
