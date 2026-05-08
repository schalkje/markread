
# Small issues

- When showing a page, go to the next; press Home in the View menu, the page does not change to the first page in the history; looks like only the page in the active tab is not refreshed, because history (forward/back) is changing position


## toggle full screen

Full screen should hide the titlebar, and the tab bar; only when the mouse get't near the top they should flow down into view, over the page
Same with side panel; should hide by default, show when the mouse nears the left side


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
- navigating links in a document, in a s subfolder, takes the folder root as basis, 
  - should take the active document as basis when startting with a folder and not starting with a /
  - when starting with a /, it should take the folder root


# deep links

When I have a deep link:
e.g.: [deep link](./documantiation/readme.md#second)

I expect it to open the page and go to the heading with the name "second". 

If the heading does not exist; go to the page top and do a toast message that the heading does not exist, but the page has ben opened.

# open in file explorer

The open in file explore / gitub functionality is not working yet.
It should be an option on the filetree menu, both on files and on folders.
If local: open file explorer on the location of the folder / file
If repo/branch: open the repo/branch in the default browser at the right location

If local also add an open in vscode option
