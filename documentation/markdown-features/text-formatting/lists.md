# Lists

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Text Formatting](./) → Lists

Lists organize related items and create clear, scannable content.

## Unordered Lists

Create bulleted lists with `*`, `-`, or `+`:

```markdown
* Item one
* Item two
* Item three
```

Results in:

* Item one
* Item two
* Item three

All three markers work identically. Choose one and be consistent.

## Ordered Lists

Create numbered lists with numbers and periods:

```markdown
1. First item
2. Second item
3. Third item
```

Results in:

1. First item
2. Second item
3. Third item

**Tip**: You can use `1.` for all items and markdown will auto-number:

```markdown
1. First
1. Second
1. Third
```

## Nested Lists

Indent with 2-4 spaces to nest lists:

```markdown
* Main item one
  * Sub-item 1.1
  * Sub-item 1.2
    * Sub-sub-item 1.2.1
* Main item two
  1. Numbered sub-item 2.1
  2. Numbered sub-item 2.2
* Main item three
```

Results in:

* Main item one
  * Sub-item 1.1
  * Sub-item 1.2
    * Sub-sub-item 1.2.1
* Main item two
  1. Numbered sub-item 2.1
  2. Numbered sub-item 2.2
* Main item three

## Mixed Lists

Combine ordered and unordered:

```markdown
1. First main point
   * Supporting detail
   * Another detail
2. Second main point
   1. Sub-point A
   2. Sub-point B
      * Detail about B
3. Third main point
```

Results in:

1. First main point
   * Supporting detail
   * Another detail
2. Second main point
   1. Sub-point A
   2. Sub-point B
      * Detail about B
3. Third main point

## Lists with Multiple Paragraphs

Add paragraphs to list items with proper indentation:

```markdown
1. First item

   This is a second paragraph in the first item.
   
   And a third paragraph.

2. Second item
   
   Another paragraph here.
```

## Lists with Code Blocks

Include code in lists:

```markdown
1. Install the package:
   
   ```bash
   npm install markread
   ```

2. Run the application:
   
   ```bash
   markread ./docs
   ```
```

## Lists with Blockquotes

```markdown
* Item with a quote:
  
  > This is a quoted text
  > in a list item.

* Another item
```

## Task Lists

Create checkboxes with `[ ]` and `[x]`:

```markdown
- [ ] Unchecked task
- [x] Checked task
- [ ] Another unchecked task
- [x] Another checked task
```

Results in:

- [ ] Unchecked task
- [x] Checked task
- [ ] Another unchecked task
- [x] Another checked task

See [Task Lists](../advanced/task-lists.md) for more details.

## Definition Lists

Create term-definition pairs:

```markdown
Term 1
: Definition of term 1

Term 2
: Definition of term 2
: Alternative definition
```

See [Definition Lists](../advanced/definition-lists.md) for more.

## Best Practices

### Consistent Markers

Choose one bullet style and stick with it:

```markdown
✓ Consistent:
* Item
* Item
* Item

✗ Inconsistent:
* Item
- Item
+ Item
```

### Proper Indentation

Use consistent indentation (2 or 4 spaces):

```markdown
✓ Consistent (2 spaces):
* Main
  * Sub
    * Sub-sub

✗ Inconsistent:
* Main
   * Sub (3 spaces)
     * Sub-sub (5 spaces)
```

### Blank Lines

Add blank lines between lists and other content:

```markdown
✓ Clear:
Paragraph text.

* List item
* List item

Another paragraph.

✗ Unclear:
Paragraph text.
* List item
* List item
Another paragraph.
```

## Complex Example

```markdown
# Project Setup Guide

1. **Prerequisites**
   
   Before starting, ensure you have:
   
   * Node.js 16+ installed
   * Git for version control
   * A code editor (VS Code recommended)

2. **Installation Steps**
   
   a. Clone the repository:
      
      ```bash
      git clone https://github.com/user/repo.git
      cd repo
      ```
   
   b. Install dependencies:
      
      ```bash
      npm install
      ```
   
   c. Configure the application:
      
      * Copy `.env.example` to `.env`
      * Update the following variables:
        - `DATABASE_URL` - Your database connection
        - `API_KEY` - Your API key
        - `PORT` - Port number (default: 3000)

3. **Verification**
   
   Run these checks:
   
   - [ ] Dependencies installed without errors
   - [ ] Configuration file created
   - [ ] Environment variables set
   - [ ] Database connection successful

4. **Next Steps**
   
   Continue to:
   
   1. [Configuration Guide](config.md)
   2. [Development Workflow](workflow.md)
   3. [Testing Setup](testing.md)
```

## See Also

- [Task Lists](../advanced/task-lists.md) - Interactive checkboxes
- [Definition Lists](../advanced/definition-lists.md) - Term definitions
- [Emphasis](emphasis.md) - Bold and italic in lists
