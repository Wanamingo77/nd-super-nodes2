# ND Super Nodes

A suite of modern, easy-to-use custom nodes for ComfyUI, including enhanced LoRA loading and powerful UI enhancements for file selection.

> **Fork notice:** This is a fork of [HenkDz/nd-super-nodes](https://github.com/HenkDz/nd-super-nodes), the original Super LoRA Loader for ComfyUI. All credit for the base project goes to the upstream author; see [Fork changes](#-fork-changes) below for what this fork adds on top.

## 🌟 Features

- Add multiple LoRAs quickly (single-click or multi-select)
- Drag-and-drop reordering (grip handle), plus move up/down arrows
- Per-LoRA enable and strengths (Model/CLIP) via a drag-to-set slider with configurable min/max/step
- Trigger words (auto or manual)
- Templates: save, load, rename, delete
- Optional tags with collapsible groups
- Duplicate detection (prevents adding the same LoRA twice)
- Works with both ComfyUI's classic canvas renderer and the newer Nodes 2.0 (Vue) renderer

## 📸 Screenshots

- ![Super LoRA Loader node overview](docs/media/super-lora-loader-overview.png) – Expanded node with inline strength controls and tag headers.
- ![ND Super Selector overlay picker](docs/media/nd-power-ui-overlay.png) – Lightning overlay with folder chips, search, and multi-select.
- ![Template browser and quick actions](docs/media/template-browser.png) – Save, load, rename, and delete templates from the overlay dialog.

## ⚡ ND Super Selector Enhancements

Enhance standard ComfyUI nodes with advanced file picker overlays:

- **Enhanced Nodes**: CheckpointLoader, VAELoader, LoraLoader, UNETLoader, CLIPLoader, ControlNetLoader, UpscaleModelLoader, and GGUF variants
- **Visual Indicators**: Golden-bordered overlay widgets with lightning icon (⚡) for easy identification
- **File Picker**: Click the overlay to open an advanced file browser with folder navigation and search
- **Per-Node Toggle**: Enable/disable enhancements via right-click menu on individual nodes
- **Persistence**: Settings and selections persist across workflow saves/loads

To enable: Right-click on a supported node → "⚡ Enable ND Super Selector"

> Note: this overlay is not yet updated for ComfyUI's Nodes 2.0 renderer (see [Fork changes](#-fork-changes) below) - it hooks into the node's mouse events the same way the Super LoRA Loader used to, and likely loses its overlay under Nodes 2.0 the same way that did before this fork's fix.

## Install

### Option 1: Compiled Release (Recommended for Users)

For a lightweight install without source code:

1. Go to [Releases](https://github.com/HenkDz/nd-super-nodes/releases) and download the latest ZIP (e.g., `nd-super-nodes-v1.0.0.zip`).
2. Extract to your ComfyUI custom nodes folder:
   - Windows: `ComfyUI\custom_nodes`
   - macOS/Linux: `ComfyUI/custom_nodes`
3. Restart ComfyUI.

### Option 2: Full Repo (For Developers/Contributors)

To get the full source code and contribute:

1. Go to your ComfyUI custom nodes folder:
   - Windows: `ComfyUI\custom_nodes`
   - macOS/Linux: `ComfyUI/custom_nodes`
2. Clone this repo:

```bash
git clone https://github.com/Wanamingo77/nd-super-nodes2.git nd-super-nodes2
```

3. Restart ComfyUI

## 🔁 Update

We ship cross-platform scripts so you can refresh without pulling the full repo:

- **Windows (PowerShell):** run `./update.ps1` inside your `nd-super-nodes` folder.
- **Linux/macOS (bash):** run `./update.sh` (optionally pass `--prerelease` or `--force`).

Behind the scenes the scripts

- check the current version via `version.json`
- download the latest lightweight release from GitHub
- create a timestamped backup in `backups/`
- replace the runtime files with the fresh build

You can also trigger an in-app check from ComfyUI via the “Check ND Super Nodes Updates” command or wait for the automatic toast that appears once per day.

## Use

1) Add node: search "Super LoRA Loader"
2) Connect MODEL (required) and CLIP (optional)
3) Click "➕ Add LoRA"; select one or use Multi-select to add many
4) Adjust strengths/trigger words; save a template if you like

Tips:

- In the overlay, use folder/subfolder chips to narrow large lists
- The first selection updates the clicked row; extra selections append
- Drag a row's grip handle (⋮⋮) up or down to reorder it, or use the ▲▼ arrows
- Drag the strength bar to set a value, or click its gear icon to type an exact value or change the slider's min/max/step (per row, or as the default for every row)

More details: see `docs/development.md`

## 🧪 Fork changes

Changes made in this fork on top of upstream, not yet upstreamed:

- **ComfyUI Nodes 2.0 (Vue) compatibility for the Super LoRA Loader node.** Nodes 2.0 (the new DOM/Vue-based node renderer, toggled via the "Modern Node Design (Nodes 2.0)" setting) skips the classic canvas drawing this node relies on, so previously the node showed up blank (only the input/output sockets) with Nodes 2.0 enabled. This fork registers a bridge widget that plugs into ComfyUI's built-in fallback for canvas-drawn custom widgets, so the node now renders and works under both the classic canvas renderer and Nodes 2.0.
  - Verified interactively against a live ComfyUI instance in both classic canvas mode and with Nodes 2.0 enabled (add/remove/reorder LoRAs, strength slider drag, settings menu, enable/disable toggle).
  - Known limitation: the ⚡ ND Super Selector overlay (for other nodes' file pickers) has not been updated yet and may not work correctly under Nodes 2.0.
- **Drag-and-drop row reordering.** Each LoRA row has a grip handle (⋮⋮): press and hold, then drag up/down to reorder past neighboring rows. Reuses the existing tag-aware move-up/move-down logic, so it respects the same tag-group boundaries the arrow buttons already did. The arrows are still there as an alternative.
- **Bigger, drag-to-set strength sliders.** Replaced the small "− value +" stepper with a wider slider bar for both Model and CLIP strength: click to jump to a value, drag to scrub continuously. A gear icon opens a small popup to type an exact value and set the slider's min/max/step range, either just for that row or as the new default for every row on the node.
- **Shorter trigger words field.** Capped at a smaller width so the LoRA name and the wider sliders have more room; the full text is still one click away to view/edit.

License: MIT
