# Change Log

All notable changes to the "blockboard" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.0] - 2026-10-18

### Added

- Save Block: save the selected code as a named block
- List blocks: search your blocks and copy one to the clipboard
- Delete Block: remove a block, with a confirmation prompt
- Two storage modes: a folder on disk (default `~/Blockboard`) or VS Code's global state
- Settings: `blockboard.storageMode` and `blockboard.libraryPath`

## [0.2.0] - 2026-10-19

### Added 
- Sidebar view
- Block previews
- edit modal and edit block command
- lists, insert, copy, and delete
- edit html, css, python, text within sidebar modal
- inline css in html files render, as well as separate css style and html. 
    - How does that copy though when you have html and css???
        - **If separate html and css sheets on blocks, it will insert or copy as if html with style tags**
