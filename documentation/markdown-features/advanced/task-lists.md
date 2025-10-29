# Task Lists

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Advanced](./) → Task Lists

Task lists create interactive checkboxes for tracking items.

## Basic Task List

```markdown
- [ ] Unchecked task
- [x] Checked task
- [ ] Another unchecked task
```

Results:

- [ ] Unchecked task
- [x] Checked task
- [ ] Another unchecked task

## Nested Task Lists

```markdown
- [ ] Main task
  - [x] Subtask 1 (completed)
  - [ ] Subtask 2
  - [ ] Subtask 3
- [x] Another main task
  - [x] All subtasks done
```

Results:

- [ ] Main task
  - [x] Subtask 1 (completed)
  - [ ] Subtask 2
  - [ ] Subtask 3
- [x] Another main task
  - [x] All subtasks done

## Tasks with Descriptions

```markdown
- [ ] **Setup Development Environment**
  
  Install Node.js, VS Code, and Git

- [x] **Complete Documentation**
  
  Write user guide and API docs

- [ ] **Deploy to Production**
  
  Final testing and deployment
```

Results:

- [ ] **Setup Development Environment**
  
  Install Node.js, VS Code, and Git

- [x] **Complete Documentation**
  
  Write user guide and API docs

- [ ] **Deploy to Production**
  
  Final testing and deployment

## Project Checklist Example

```markdown
## Project Milestones

- [x] Planning
  - [x] Requirements gathering
  - [x] Architecture design
  - [x] Technology selection
  
- [x] Development
  - [x] Core features
  - [x] UI implementation
  - [x] Testing
  
- [ ] Release
  - [x] Documentation
  - [ ] Marketing materials
  - [ ] Distribution setup
  - [ ] Launch announcement
```

Results:

## Project Milestones

- [x] Planning
  - [x] Requirements gathering
  - [x] Architecture design
  - [x] Technology selection
  
- [x] Development
  - [x] Core features
  - [x] UI implementation
  - [x] Testing
  
- [ ] Release
  - [x] Documentation
  - [ ] Marketing materials
  - [ ] Distribution setup
  - [ ] Launch announcement

## Note About Interactivity

In MarkRead, task lists are **read-only** (viewer mode). Checkboxes display status but cannot be toggled.

To update task lists:
1. Open file in your editor
2. Change `[ ]` to `[x]` or vice versa
3. Save file
4. MarkRead auto-reloads (if enabled)

## Best Practices

✅ Use for tracking progress
✅ Group related tasks
✅ Be specific with task descriptions
✅ Keep lists manageable (< 20 items)

❌ Don't use for regular lists
❌ Don't nest more than 3 levels
❌ Don't mix task and regular lists

## See Also

- [Lists](../text-formatting/lists.md)
- [Definition Lists](definition-lists.md)
