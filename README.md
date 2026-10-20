# Blockboard

A VS Code extension that adds a visual library for HTML/CSS components and code snippets. Select code, save it as a named block, and bring it back whenever you need it.

## Sidebar

Click the Blockboard icon in the Activity Bar to see your library as cards. HTML blocks show a live preview, CSS-only blocks show an X, and other languages show a short code card. Each card has:

- **Edit**: change the name, HTML and CSS in a small editor with a live preview
- **Copy**: copies the block to the clipboard (CSS goes in a `<style>` tag)
- **Insert**: puts the block at the cursor, or over the selection, in your editor
- **Delete**: removes the block after you confirm

Previews are sandboxed: scripts in a block do not run and remote resources are not loaded.

## Commands

Open the Command Palette (Cmd+Shift+P) and run:

- **Save Block**: saves your current selection under a name
- **List Blocks**: search your saved blocks and copy one to the clipboard
- **Insert Block**: pick a block and insert it at the cursor
- **Edit Block**: pick a block and edit it in the sidebar
- **Delete Block**: removes a saved block

## Settings

- `blockboard.storageMode`: `folder` (default) saves each block as a JSON file, `globalState` keeps blocks inside VS Code
- `blockboard.libraryPath`: the folder used in folder mode (defaults to `~/Blockboard`)

## Status

Early development. 

## License

AGPL-3.0-only. For other licensing terms, contact me @ [bcnddigital@pm.me].