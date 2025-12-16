# Electron

It is time for a full redesign of the application. 

Step 1 is create a summary design and requirements document based on existing features and the code base:
- functionality
- UI

The goal is to setup a new architecture based on an Electron-first as a desktop product solution. The look and feel as well as the speed from vscode is a benchmark.

optimize everything around desktop:
- single-window + tabs + multi-pane layout
- full keyboard model + command palette
- filesystem + folder watching as first-class
- native menus / global shortcuts
- “open with”, drag/drop, recent files
- offline by default

There are some alternative requirements we need to add to the mix:
- support multiple open folders, each weith their own set of tabs

Keep old code in an _old folder, to be removed sometime in the future.

Keep the images as specified, and follow or improve existing color schemes.
Theming dark vs light, with the option to add a high contrast should be core.

Really look at the existing feature documentation and at the implementation to grasp all functionality and moder UI features and map them on the best practices from vscode.


I see no tabs; please add these requirements to the specification and add new tasks where necessary.
## Tabs

- I expect a line with the tabs. Each tab has a title and a close button.
    - when the number of tabs go of screen, small navigation buttons appear <>
    - a context menu for the tab:
        - close
        - dupplicate
        - move to new window
- The tabs are clearly recognizable from what folder they come from
- Tabs are clearly recognizable when they are connected to the active folder; and when not
- if a Tab is connected to a direct loaded file:
    - show this in the folder selector: "direct file" or something that fits
    - visualize the filetree as inactive / inapplicable in a user friendly way, with a nice message
    - would the open file open folder buttons fit in this view?
    - add a button: open folder for this file; this will keep the file open, but connect it to the folder where it lives
- Tabs can be organized, and the order can be changed with a keyboard shortcut ro drag and drop

### File menu
- open file
- open folder

### New window

- A tab has a contect menu: duplicate, open in new window
- When right clicking a file in the file tree, there is a context menu:
    - open (in current tab)
    - open in new tab
    - open in new window
- When right clicking a folder in the file tree, there is a context menu:
    - open as new folder
    - open in new window


## Title bar

Should us a custom title bar like in vscode.

For Markread this one title bar should contain 3 sections:
- left:
    - Menu: File, Edit, ...
    - browse buttons < and >    
- middle:
    - name of the active folder (or file when a file has been opened directly)    
- right
    - theme button: sun (make light) / moon (make dark)
    - search button (default: search in file)
    - download button
    - windows buttons: minimize, maximize,windowed, close



## Mardown features

Can you extend the markdown-it display with these plugins:

https://github.com/markdown-it/markdown-it-footnote
https://github.com/markdown-it/markdown-it-abbr
https://github.com/markdown-it/markdown-it-deflist
https://github.com/markdown-it/markdown-it-mark
https://github.com/markdown-it/markdown-it-sub
https://github.com/markdown-it/markdown-it-sup
markdown-it-task-lists
markdown-it-container
markdown-it-github
markdown-it-table-of-contents
markdown-it-emoji

## syntax highlighting

Use highlight.js for highlighting code

### Extend with
https://github.com/arronhunt/highlightjs-copy