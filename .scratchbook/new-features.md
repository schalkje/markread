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



# Home page
## last x opened
extend with last x opened, sort by last opened
Make columns; just like the buttons:
- Files
- Folders
- Repo's and branches

Take some inspiratin for the ui from the folder selector

On mouse over, see when it was last opened

## favorites
The user can add/remove favorites and even add a description to them. These favorites, stay on top of the last x opened; sort alphabetically




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



# Find
Implement search and find, to locate specific text.

## find in document
CTRL+F
Connect the option in the Edit menu

- show a search bar above the text: search string, toggles, result hit nr of total; next, previous hit buttons; close search button
- search a text in the current document
- toggle to switch on/off case sensitivity (default off)
- add the option to search using regexp

Output:
- mark the vertical scroll bar, make the results visible and clickable
- give all found results a yellow background
- navigate through the finds (use default shortcuts like vcode)

## find in files
SHIFT+CTRL+F
Connect the option in the Edit menu

Search in all files
- ability to define the scope:
  - current folder/repo-branch
  - current folder/repo all branches
  - all folders/repo's in the folder selector

- toggle to switch on/off case sensitivity (default off)
- add the option to search using regexp

Output:
- in the place of the filetree/history, add a pane for search results
- show the results per folder / file
- show stats at the folder level and at the file level of how many hits
- take inspiration from the find in files of vscode


the search in files seams to need the search in file box. What's the idea here?
Currently the Find in page text is not filled; so it is not working. Shouldn't it be separate functionality, or do they need to use each other?
