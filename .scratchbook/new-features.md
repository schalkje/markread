


# Support multiple folders

# connect to git repositories

support:

* [ ] Azure Devops GIT
* [ ] Github

List of default repo's

The connect to repo screen should be able to support multiple providers:
- GitHub
- Azure DevOps Git

## Azure DevOps git
Azure Devops is build in this way:
- Organization
- Project
- Repo

Authentication is done on the organisation level
Authorisation is done on project and repo level

It should be easy and logical for the user to find and navigate the projects and repo's that he has access to.
The user should be able to copy and paste the full repo url to the repo url box; two different formats that both should work, e.g.: 
- https://schalken.visualstudio.com/_git/Personal%20Assistant
- https://schalken.visualstudio.com/DefaultCollection/Personal%20Assistant/_git/Personal%20Assistant
- https://schalken.visualstudio.com/DefaultCollection/Personal%20Assistant/_git/agent-function
NB. give the possibility to building or changing the url step by step organzation, project, repo


## Connection screen
When connecting to a repo:
1. select the repo
2. select the branch: default is in order of occurence: main, master, development, alphabeticaly first

This means in the stored history, it should include the branch; if more than one branch has been selected for a repo they should be grouped together

When selecting a historical branch; do not show the branch selector step, just open the repo/branch
It should be possible to click on the repo from the history (not only the branches); when selecting the repo, the branch selector should show


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

# Home page
## last x opened
extend with last x opened, sort by last opened
Make columns; just like the buttons:
- Files
- Folders
- Repo's and branches

On mouse over, see when it was last opened

## favorites
The user can add/remove favorites and even add a description to them. These favorites, stay on top of the last x opened; sort alphabetically

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



