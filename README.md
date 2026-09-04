
## 🧪 Fork changes (in testing)

Changes made in this fork on top of upstream, not yet upstreamed:

- **ComfyUI Nodes 2.0 (Vue) compatibility for the Super LoRA Loader node.** Nodes 2.0 (the new DOM/Vue-based node renderer, toggled via the "Modern Node Design (Nodes 2.0)" setting) skips the classic canvas drawing this node relies on, so previously the node showed up blank (only the input/output sockets) with Nodes 2.0 enabled. This fork registers a bridge widget that plugs into ComfyUI's built-in fallback for canvas-drawn custom widgets, so the node now renders and works under both the classic canvas renderer and Nodes 2.0.
  - Status: **in testing**. Verified with `npm run type-check` / `npm run build`; not yet fully verified end-to-end in a live ComfyUI instance with Nodes 2.0 toggled on. Classic (canvas) rendering is unchanged.
  - Known limitation: the ⚡ ND Super Selector overlay (for other nodes' file pickers) has not been updated yet and may not work correctly under Nodes 2.0.

License: MIT
