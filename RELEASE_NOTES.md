# Release Notes

## v1.2.3 (2026-03-04)

This update improves the element selection experience with smarter highlighting and a new keyboard shortcut.

### ✨ New Features

- **Cancel selection with Escape**: Press `Esc` at any time during element selection to cancel and return to idle state. The popup status indicator resets automatically.

### 🎨 Improvements

- **Smart highlight overlay**: The selection highlight is now a fixed-position overlay instead of a CSS outline, so it always reflects precisely what will be captured:
  - **Clipboard OFF (normal capture)**: Dashed blue border clipped to the visible viewport — shows exactly what the screenshot will contain.
  - **Scroll Element ON, element fits**: Dashed blue border covering the full element.
  - **Scroll Element ON, element extends beyond viewport**: Dashed indigo border at the visible clip edge, plus a **"↕ Full Element"** badge to indicate the capture includes content below the fold.
- **Viewport-clip for oversized elements**: When _Scroll Element_ is disabled and you click an element that extends beyond the viewport, the capture rect is now clamped to the visible area — no more black/empty regions in the output image.
- **Dimension label improvements**:
  - Label always stays on one line (`white-space: nowrap`).
  - Horizontally clamped so it never overflows the left or right viewport edge.
  - Flips above the bottom edge when there is not enough space below.
  - Shows the clipped (visible) dimensions when _Scroll Element_ is OFF, and the full element dimensions when it is ON.
- **Full Element badge positioning**: The badge flips inside the overlay when it would overflow the bottom of the screen.

### 🐛 Fixes

- Fixed capture of elements larger than the viewport producing black/empty areas when _Scroll Element_ is disabled.

---

## v1.2.2 (2026-02-14)

This update focuses on streamlining the user interface and improving the overall user experience with a cleaner, more modern design.

### ✨ New Features

- **Redesigned Popup UI**: The extension popup has been completely redesigned with a modern dark theme, featuring improved typography and consistent styled components.
- **Sliding Settings Panel**: Advanced options ("Format", "Quality", "Delay", "Scroll Element") have been moved to a dedicated sliding settings panel to reduce clutter on the main screen.

### 🎨 Improvements

- **Cleaner Home Screen**: The main view now focuses on the primary actions: "Select Element", "Screen Shot", "Full Page", and the "Clipboard" toggle.
- **Improved Slider Layout**: Quality and Delay sliders have been refactored for better readability, with value indicators now positioned to the right of the sliders.
- **Enhanced Visuals**: Updated buttons, switches, and sliders with a refined color palette (Slate & Blue) and smoother interactions.

### 🐛 Fixes

- Fixed layout issues where nested containers caused double borders.
- Corrected spacing and alignment in the settings controls.
- Optimized popup dimensions for consistent rendering across platforms.
