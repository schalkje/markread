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