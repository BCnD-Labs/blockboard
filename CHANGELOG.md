# Change Log

All notable changes to the "blockboard" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.0] - 2026-10-20

### Added

- Sidebar: a Blockboard icon in the Activity Bar shows every saved block as a card, with an empty state when the library is empty
- Live previews: HTML blocks render in a sandboxed preview (no scripts, no remote resources) on a plain white background; styles can be inline, in a `<style>` tag, or in the block's CSS field
- CSS-only blocks show an X placeholder, and other languages show a truncated code card
- Edit modal: change a block's name, HTML and CSS with a live preview, then save or cancel
- Edit Block command: pick a block and edit it in the sidebar
- Insert Block command and a sidebar Insert button: put a block at the cursor or over the selection
- Copy and Delete buttons on every card (Delete asks first)
- The sidebar refreshes after any change and when `blockboard.storageMode` or `blockboard.libraryPath` changes

### Changed

- List Blocks now copies a block's CSS (in a `<style>` tag) along with its HTML
- Blocks that cannot be read are skipped instead of breaking the list, and the list shows newest blocks first
- Blocks can now store a separate CSS field and an updated time. Block files from 0.1.0 still load unchanged

### Known issues

- The first time the sidebar loads, previews can be blank until the sidebar reloads (for example after saving an edit). See #44

## [0.1.0] - 2026-10-18

### Added

- Save Block: save the selected code as a named block
- List blocks: search your blocks and copy one to the clipboard
- Delete Block: remove a block, with a confirmation prompt
- Two storage modes: a folder on disk (default `~/Blockboard`) or VS Code's global state
- Settings: `blockboard.storageMode` and `blockboard.libraryPath`