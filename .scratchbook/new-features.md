# revamp to MAUI

# Support multiple folders

# connect to git repositories

support:

* Azure Devops GIT
* Github
* other through default git protocal


List of default repo's

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

## last x opened

extend with last x opened

## favorites

The user can add/remove favorites and even add a description to them.

# Multiple documents at the same time

## Open in new window

## 2 document

Support split window: 2 documents horizontal / vertical

## find the differences

* compare 2 files and highlight the differences
* compare 2 folders and find and hightlight the diferences

