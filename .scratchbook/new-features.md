
# Small issues

- Dark mode findings:
    - home page stays white in dark mode
        - header text changes font color
        - explanation text does not
        - branch icon stays light too, text changes to darm mode
    - Open repository button stays light
    - About box stays light, some text change

## Add support for container
use https://github.com/markdown-it/markdown-it-container?tab=readme-ov-file

Add a demo page under advanced

::: warning
*here be dragons*
:::

Different classes for info, warning, error

## empty file renders as failure
When I open a markdown file with no content at all, I get:
Failed to Render Markdown
Failed to load file

I expect an empty file; or if more logical, a message the file is empty

# Clean up wpf
Clean all files that are related to wpf or dotnet development. They should not be needed anymore in the electron solution.

Remove all references to wpf from the markdown documentation. Remove entire markdown files when they have become obsolete. Update files where the story changed because of the switch from wpf to electron.

Files that can stay unchanged:
- Changelog.md
- All files in the .specify folder


# Index

Have an index file on a central location with the users favorites

* Location
* Branch (for git folders)
* include a description

## index file

There can be one or more local index files.
They can be custom references, or if there is a markread.json in the folder use those settings. The `root` and `description` parameters in the index files override the markread.json values when specified.

Name: `{name}.index.json` where name can be anything, e.g.: `github.index.json`, `local.index.json`

```json
[
    {
        "location" : "c:/repo/markread",
        "root": "documentation",
        "description": "Local MarkRead"
    },
    {
        "location" : "https://github/...",
    }
]
```

## subscribe to a git repo

in the root there is a markread.json file

```json
{
    "root": "/",
    "description": "MarkRead is a tool to view and navigate documentation written in markdown files."
}
```


---

# refreshing
I want a way of refreshing the visible page
I want a way of refreshing the folderview for the current folder or repo/branch

# ignore folders
Ignoring folders:
- A base list should be available of folders that are by default not read (open folder, open repo/branch)
- there is a setting where this list can be seen and modified; there is also a button here to reset to the defaults

# Export to pdf function

# Export mermaid diagrams
Export or copy to clipboard mermaid diagrams as svg.

have hoover buttons:
- that copy as image
- copy mermaid code
- download image

## Open mermaid in new dedicated tab
- open mermaid in new tab

---


# Markdown viewer
## split document vertically or horizontally
A document can be split in two views, both on the same file.

The zoom and postition should be stored/retrieved per view

- both views have their own horizontal and vertical scrollbar
- the zoom in the title bar is on the view that is selected; after split the default is the new view selected


## Multiple documents at the same time
### split viewer vertically:
Split the viewer vertically; each with it's own tabbar

### Open in new window
This can be done with 2 options:
- Move to new window - current tab is moved to a new window; this option is only active when there are more than 1 tabs
- Copy to new window - Make a new view in a new window on the same file, take along the history

## 2 document

Support split window: 2 documents horizontal / vertical

## find the differences

* compare 2 files and highlight the differences
* compare 2 folders and find and hightlight the diferences

# small improvements

- when zoomed in (application), also zoom in mouse over (e.g. file tree, chapters in scroll bar)
- mouse buttons for forward and back should work, now they do nothing
- navigating links in a document, in a s subfolder, takes the folder root as basis, 
  - should take the active document as basis when startting with a folder and not starting with a /
  - when starting with a /, it should take the folder root


