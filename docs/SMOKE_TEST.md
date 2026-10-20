# Blockboard manual smoke test

Run this in the Extension Development Host (press F5) before every release. It covers what the automated tests cannot: the sidebar page, previews and modal. Tick a box only when you saw the result yourself. If something fails, note what you saw next to the item and open a bug.

Release version under test: `____`  Date: `____`  Tester: `____`

## 0. Setup

Use a throwaway library so your real blocks are safe. In the Extension Development Host, open Settings and set `blockboard.libraryPath` to an empty folder, for example `~/TESTING`. Then in a terminal:

```sh
export LIB=~/TESTING        # same folder as blockboard.libraryPath
mkdir -p "$LIB"

# A real v0.1-era block file: no css, no updatedAt, id matches the file name.
cat > "$LIB/1700000000000.json" <<'EOF'
{
  "id": "1700000000000",
  "name": "Old v0.1 button",
  "language": "html",
  "code": "<button style=\"padding:8px 16px;background:#2b6cb0;color:#fff;border:0;border-radius:4px\">Old button</button>",
  "createdAt": "2025-10-01T12:00:00.000Z"
}
EOF

# A truly corrupt file, and valid JSON that is not a block.
printf '{ this is not json' > "$LIB/corrupt.json"
echo '{"foo": 1}' > "$LIB/not-a-block.json"
```

Do not create these fixtures with Save Block. That stores the text as a new block with a new id and the wrong language, and does not test the old file format.

Block files are named `<id>.json`, so after saving a block you can find its file with `ls -t "$LIB" | head` (newest first) and read it with `cat "$LIB/<file>"`.

Scratch code to select and save (open a new untitled file, set its language, paste, select, run "Blockboard: Save Block"):

HTML with a style tag (name it `style tag`):

```html
<style>
.card { font-family: sans-serif; padding: 16px; border: 2px solid #0f766e; border-radius: 8px; width: 160px; }
.card h3 { margin: 0 0 6px; color: #0f766e; }
</style>
<div class="card"><h3>Hello</h3><p>Styled by a style tag.</p></div>
```

HTML with inline style (name it `inline style`):

```html
<button style="padding:10px 18px;background:#b91c1c;color:#fff;border:0;border-radius:8px;font-size:16px">Inline styled</button>
```

CSS only (language `css`, name it `css only`):

```css
.btn { background: #7c3aed; color: white; padding: 8px 16px; }
```

Python (language `python`, name it `python`):

```python
def greet(name):
    return f"Hello, {name}"
```

Hostile HTML (language `html`, name it `hostile`):

```html
<div id="t">Script test</div>
<script>document.getElementById("t").textContent = "SCRIPT RAN"; alert("script ran");</script>
<style>body { display: none !important; } * { color: red !important; }</style>
<img src="https://example.com/x.png">
```

## 1. Sidebar and empty state

- [ ] **First: preview iframes render at all.** Open the Blockboard Activity Bar icon. The `style tag` card shows a teal-bordered card with "Hello", not a blank box.
- [ ] With an empty library folder, the sidebar shows "No blocks saved yet..." and no cards.
- [ ] After saving a block, the sidebar updates without a manual refresh.
- [ ] Closing and reopening the sidebar shows the same cards.

## 2. Old and broken files

- [ ] The v0.1 fixture `Old v0.1 button` appears as an `html` card with a blue rendered button.
- [ ] The sidebar still lists every other block; no error page appears because of `corrupt.json` or `not-a-block.json`.
- [ ] List Blocks and Edit Block pickers also work with those two files present.
- [ ] `corrupt.json` and `not-a-block.json` are unchanged afterwards (`cat` them).

## 3. Rendering

- [ ] `style tag` renders styled by its `<style>` tag.
- [ ] `inline style` renders a red button.
- [ ] A block with both inline styles and a `css` field renders with the `css` field winning on conflicts (set this up with the edit modal in section 4).
- [ ] Every card has the same size. Paste a very tall or wide HTML block (for example a 1000px-wide div); it is clipped inside the card and does not stretch the layout.
- [ ] The preview background is plain white even with a dark VS Code theme.
- [ ] `css only` shows an empty box of the standard card size with a large X.
- [ ] `python` shows a monospace code card with the language label `python`, with no errors. A long file is truncated with an ellipsis.

## 4. Edit modal

Use `style tag` unless noted.

- [ ] Edit opens a modal with Name, HTML and CSS fields and a preview that shows the block **immediately**, before you type anything.
- [ ] Typing in the CSS field only (for example `.card { border-color: red; }`) changes the preview live.
- [ ] Typing in the HTML field changes the preview live.
- [ ] Save closes the modal and the card now shows the edit.
- [ ] Run "Developer: Reload Window". The edited card still shows the edit.
- [ ] Check the file: `cat "$LIB/<file>"` has `css` and `updatedAt`, and `id` and `createdAt` are unchanged. Compare with the file before editing.
- [ ] Edit the v0.1 fixture (`cat "$LIB/1700000000000.json"` before and after): it opens with a rendered preview, saves, still renders, and keeps id `1700000000000` and createdAt `2025-10-01T12:00:00.000Z`.
- [ ] Clearing the name and pressing Save shows "Name cannot be empty." and the modal stays open.
- [ ] Cancel (button and Escape) closes the modal and changes nothing.
- [ ] Edit on `python`: Name and Code only, no CSS field, no preview. Save works.
- [ ] Edit on `css only`: Name and Code only, no CSS field, no preview. Save works.

## 5. Edit Block command

- [ ] With the sidebar closed, "Blockboard: Edit Block" lists blocks; picking one opens the sidebar with that block's edit modal.
- [ ] With the sidebar open, the same command opens the modal for the picked block.
- [ ] Cancelling the picker does nothing and shows no error.

## 6. Copy, Insert, Delete

- [ ] Copy on `style tag`, then paste into an editor: the HTML is there, plus the CSS wrapped in a `<style>` tag for a block that has a `css` field.
- [ ] Insert with the cursor in an editor: the block text appears at the cursor.
- [ ] Insert with a selection: the selection is replaced.
- [ ] Insert with no editor open shows a warning and changes nothing.
- [ ] Delete asks for confirmation. Cancelling keeps the block. Confirming removes the card and the file.

## 7. Command Palette commands

- [ ] Save Block adds a block and the sidebar updates.
- [ ] List Blocks copies the chosen block to the clipboard (CSS included in a `<style>` tag for blocks with a `css` field).
- [ ] Delete Block asks for confirmation and the sidebar updates.

## 8. Storage settings

- [ ] Change `blockboard.libraryPath` to another folder: the sidebar refreshes and shows that folder's blocks (or the empty state).
- [ ] Change it back: the original blocks return.
- [ ] Set `blockboard.storageMode` to `globalState`: the sidebar shows the global-state library (probably empty). Save, edit, copy and delete work there too.
- [ ] Set it back to `folder`: the folder library returns.

## 9. Safety

- [ ] The `hostile` card shows "Script test" and no alert appears. The text never changes to "SCRIPT RAN". Opening it in the edit modal does not run the script either.
- [ ] The `hostile` block's `body { display: none }` and red `*` rule do not change the sidebar: other cards, buttons and text look normal.
- [ ] Sidebar styling does not change how previews look (the `style tag` card keeps its own fonts and colors).
- [ ] The remote image in `hostile` does not load (nothing is fetched from example.com).

## After the release (v0.2.x ideas)

Not part of the v0.2.0 gate. Try these once and file issues for anything rough.

- [ ] Scale: with 100+ blocks, does the sidebar open quickly and scroll smoothly?
- [ ] Themes and keyboard: light, dark and high-contrast themes; can every card action and the modal be used with the keyboard only; is focus sensible when the modal opens and closes?
- [ ] Remote resources stay blocked: `<link>`, `@import` and `url(http...)` in a block load nothing.
- [ ] Concurrency: two VS Code windows on the same library; edit or delete in one and see what the other shows.
- [ ] Windows paths: a `libraryPath` such as `C:\Users\me\Blockboard`, and a path with spaces.
- [ ] Packaging: install the `.vsix` into a normal VS Code and check that the sidebar icon, styles and script load (webview assets come from `media/`).
