# Element Snapper

🌐 **Website:** [element-snapper.pakool.com](https://element-snapper.pakool.com/)

**v1.4.0** — A professional Chrome extension that captures pixel-perfect screenshots of any webpage element, the visible viewport, or an entire scrollable page — with capture previews, session history browser, floating panel, configurable keyboard shortcuts, clipboard support, delayed capture, and smart element highlighting.

## Features

- **Pixel-Perfect Capture**: DPR-aware cropping for crisp screenshots on Retina and HiDPI displays
- **Smart Element Highlight**: Fixed-position overlay shows exactly what will be captured — dashed blue for normal captures, dashed indigo when the element extends beyond the viewport
- **Viewport-Clip**: When _Scroll Element_ is disabled, captures only the visible portion of any element — no black/empty areas
- **Full Element Capture**: CDP-powered single-shot full-page capture — no tile stitching, no delay, no seam artifacts
- **Capture Preview**: macOS-style thumbnail slides in after every capture; click to expand into a full modal with Download, Copy, and Close
- **Capture History Browser**: Session-scoped history of recent captures accessible via a thumbnail strip in the preview modal; remove individual captures with an inline confirm flow
- **Floating In-Page Panel**: Persistent, draggable panel injected via Shadow DOM — stays open across captures without reloading the popup
- **Configurable Keyboard Shortcuts**: Per-OS safe defaults for each capture mode, with an enable toggle and one-click reset
- **Area Capture**: Click-and-drag region selection with live pixel-dimension label
- **Quick Actions**: One-click **Area**, **Screen** (viewport), and **Page** (full scrollable page) buttons
- **Cancel with Escape**: Press `Esc` during element selection to cancel and return to idle
- **Clipboard Support**: Copy screenshots directly to clipboard instead of downloading
- **Capture Notifications**: Toast feedback for successful captures and errors
- **Delayed Capture**: Configurable countdown timer (0–10 s) for capturing hover states, menus, and dynamic content
- **Sliding Settings Panel**: Format, Quality, Delay, and Scroll Element options tucked in a dedicated settings view
- **Format Options**: Save as PNG (lossless) or JPEG (with quality control 1–100 %)
- **Debug Mode**: Visual tile borders during multi-tile capture
- **Edge Case Handling**: Handles fixed elements, scrollable containers, and cross-origin iframes
- **Flexible Output**: Download to the default downloads folder or copy to clipboard

## Installation

### From Chrome Web Store

_Coming soon - Extension will be published to Chrome Web Store_

### Load as Unpacked Extension (For Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `element-snapper` directory
6. Extension icon should appear in toolbar

## Usage

### Element Capture

1. Click the extension icon to open the popup
2. Click **Select Element**
3. Hover over elements — a dashed overlay shows what will be captured
4. Click the desired element to capture it
5. Press **Escape** at any time to cancel selection
6. Screenshot is saved to downloads (or clipboard if enabled)

> **Tip:** If the element extends beyond the screen, the overlay turns indigo with a _↕ Full Element_ badge. Enable **Scroll Element** in Settings to capture the complete element.

### Quick Actions

- **Screen Shot** — instantly captures the current visible viewport
- **Full Page** — scrolls through the entire page and stitches tiles into one image

### Clipboard Toggle (main view)

Toggle **Clipboard** on to copy screenshots directly to your system clipboard instead of downloading a file.

### Settings (tap the ⚙ gear icon)

- **Format** — PNG (lossless) or JPG (smaller file size)
- **Quality** — JPEG compression quality 1–100 (default 95, hidden for PNG)
- **Delay** — countdown timer 0–10 s before capture; useful for hover states, dropdown menus, and tooltips
- **Scroll Element** — enable multi-tile stitching to capture elements taller/wider than the viewport; when disabled only the visible portion is captured
- **Debug** _(hidden by default)_ — shows red/green tile borders during multi-tile capture

All settings are automatically saved and restored between sessions.

## Technical Details

### Architecture

```
Popup ──> Content Script ──> Service Worker ──> Download
  ↑            ↓                    ↓
  └────────────┴────────────────────┘
```

**Message Flow:**

1. Popup sends "startSelection" to content script
2. Content script enables element highlighting
3. User clicks element
4. Content script sends element rect + metadata to service worker
5. Service worker captures viewport, crops to element, downloads

### DPR-Aware Cropping

The extension handles high-DPI displays correctly:

```javascript
// Element position in CSS pixels
const rect = element.getBoundingClientRect();

// Convert to physical pixels
const dpr = window.devicePixelRatio;
const sx = rect.x * dpr;
const sy = rect.y * dpr;
const sWidth = rect.width * dpr;
const sHeight = rect.height * dpr;

// Crop from captured screenshot (already in physical pixels)
ctx.drawImage(screenshot, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
```

### Full Element Capture (Multi-Tile Stitching)

For elements larger than the viewport, the extension uses a sophisticated multi-tile capture and stitching algorithm:

#### Algorithm Overview

1. **Tile Grid Calculation**: Divide element into viewport-sized tiles

   ```javascript
   const tilesX = Math.ceil(elementWidth / viewportWidth);
   const tilesY = Math.ceil(elementHeight / viewportHeight);
   ```

2. **Sequential Tile Capture**: For each tile:
   - Scroll to position the tile in viewport
   - Capture the visible viewport
   - Extract the correct portion from the capture
   - Draw onto final canvas at correct position

3. **Coordinate Conversion**: Handle document boundaries correctly

   ```javascript
   // Target scroll position for this tile
   const targetScrollX = elementAbsX + tileX * viewportWidth;

   // Actual scroll (may differ at document boundaries)
   const actualScrollX = getActualScrollPosition();

   // Calculate where element region appears in viewport
   const viewportOffsetX = regionAbsX - actualScrollX;

   // Extract from correct position (not always 0!)
   const sx = viewportOffsetX * dpr;
   ```

#### Handling Document Boundaries

**The Problem:**
When capturing near page edges, the browser can't scroll to the target position, causing potential overlap if not handled correctly.

**Example:**

```
Element: 2400px wide, Page: 1700px wide, Viewport: 1000px
Max scroll: 700px (1700 - 1000)

Tile 0: Scroll to x=0    → Actual x=0   ✓
Tile 1: Scroll to x=1000 → Actual x=700 ✗ (boundary!)
Tile 2: Scroll to x=2000 → Actual x=700 ✗ (boundary!)
```

**The Solution:**
Use actual scroll position to calculate viewport offset:

```javascript
// Tile 1 example:
targetScrollX = 1000;
actualScrollX = 700;  // Hit boundary!

// Region we want is at page position 1000-2000
regionAbsX = 1000;

// Calculate where this region appears in viewport
viewportOffsetX = regionAbsX - actualScrollX;
              = 1000 - 700
              = 300;  // Extract from x=300, not x=0!

// Extract correct portion
ctx.drawImage(capture, 300*dpr, 0, ...);  // ✓ No overlap!
```

This ensures each tile extracts a unique portion of the element, even when scrolling hits document boundaries.

#### Debug Mode Visualization

When debug mode is enabled:

- **Red border**: Shows the full element being captured (static)
- **Green border**: Shows the current tile being captured (moves with each tile)
- Helps visualize the multi-tile stitching process

### File Structure

```
element-snapper/
├── manifest.json              # Manifest V3 configuration
├── popup/
│   ├── popup.html            # Popup UI structure
│   ├── popup.js              # Popup logic and messaging
│   └── popup.css             # Professional styling
├── content/
│   ├── utils.js              # Utility functions
│   ├── element_selector.js   # Element selection logic
│   └── content-main.js       # Message routing
├── background/
│   └── service_worker.js     # Screenshot capture & download
├── icons/                    # Extension icons
├── test.html                 # Test page with various elements
└── README.md                 # This file
```

## Edge Cases

### Cross-Origin Iframes

- Cannot access iframe internals due to browser security
- Extension captures the iframe element itself
- Console warning is logged

### Fixed/Sticky Elements

- Element is scrolled into view before capture
- Works correctly with `position: fixed` and `position: sticky`

### Elements Outside Viewport

- Automatically scrolled into view with smooth behavior
- Small delay ensures scroll completes before capture

### High DPR Displays

- Correctly handles Retina (2x), 4K (3x+) displays
- Canvas operations use physical pixels throughout
- Screenshots are high resolution, never blurry

## Limitations

1. **Multi-Capture Performance**: Full element capture uses multiple viewport captures which takes time (Chrome API rate limit: ~2 captures/second)
2. **Cross-Origin Content**: Cannot capture content from different domains (e.g., inside iframes from other sites)
3. **Dynamic Content**: Some animations or video elements may not capture correctly
4. **Restricted Pages**: Cannot capture on `chrome://`, `file://`, or Chrome Web Store pages
5. **Max Canvas Size**: Element dimensions cannot exceed 16,384px (browser canvas limitation)

## Browser Compatibility

- Chrome 88+ (Manifest V3 requirement)
- Chromium-based browsers (Edge, Brave, Opera)

## Privacy

- **No Data Collection**: Extension does not collect, store, or transmit any user data
- **Local Only**: All processing happens locally in browser
- **No Network Requests**: Extension does not make any external network calls
- **Minimal Permissions**: Only requests necessary permissions (activeTab, downloads, storage)

## Testing

### Using the Test Page

1. Load the extension in Chrome
2. Open `test.html` in your browser
3. Test capturing various element types:
   - Basic div elements
   - Small inline elements
   - Elements in scrollable containers
   - Fixed position elements
   - Images and tables
   - Cross-origin iframes
   - Complex nested structures
   - Elements requiring scroll

### Debugging

**Content Script Console:**

```
1. Open page where extension is active
2. Press F12 to open DevTools
3. Check Console tab for content script logs
```

**Service Worker Console:**

```
1. Navigate to chrome://extensions
2. Find "Element Snapper"
3. Click "service worker" link
4. Service worker console opens in new window
```

**Popup Console:**

```
1. Right-click extension icon
2. Select "Inspect popup"
3. Popup DevTools opens
```

## Development

### Project Structure

The extension follows a modular architecture:

- **popup/**: UI components for extension popup
- **content/**: Scripts injected into web pages
- **background/**: Service worker for capture logic
- **icons/**: Extension icons (replace placeholders with custom icons)

### Making Changes

1. Edit files as needed
2. Go to `chrome://extensions`
3. Click refresh icon for "Element Snapper"
4. Test changes

### Color System

The extension uses a consistent professional color palette:

- **Primary**: #2563eb (blue)
- **Success**: #10b981 (green)
- **Error**: #ef4444 (red)
- **Neutral**: #6b7280 (gray)

## Troubleshooting

### Extension Icon Not Showing

- Ensure extension is enabled in `chrome://extensions`
- Check for manifest errors in extension details

### "Please refresh the page" Error

- The page was loaded before the extension
- Refresh the page (F5) and try again

### Screenshots Are Blurry

- This should not happen with DPR-aware cropping
- If it does, please report as a bug

### Element Not Capturing

- Ensure element is visible in viewport
- Check browser console for errors
- Try clicking element again

### Download Fails

- Check Chrome download permissions
- Ensure sufficient disk space
- Check Downloads folder for saved file

## Contributing

Contributions are welcome! Please:

1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License - feel free to use this extension for any purpose.

## Credits

Built with Chrome Extension Manifest V3 APIs. No external libraries used.

## Support

Buy me a coffee: [https://buymeacoffee.com/panat.siriwong](https://buymeacoffee.com/panat.siriwong)
