/**
 * Element Snapper - Editor
 *
 * A board like a design tool's canvas: the capture starts as an image inside a
 * frame, and only what's inside the frame is copied or downloaded (Crop sets
 * the frame). Boxes, arrows, text, blur, redact and more images are items on
 * the board that can be selected, moved, resized, restyled and deleted.
 *
 * Opened as editor.html#capture=<historyId> (the preview's Edit button) or
 * editor.html#doc=<docId> (My edits). A capture becomes a saved doc
 * (store.js) on its first edit and is saved after every edit from then on.
 *
 * Coordinates: board ("world") units are the capture's own pixels, so at 100%
 * a capture shows at the size it had on the page. doc.unit is the screen scale
 * it was taken at; line widths and text sizes are in CSS px times doc.unit.
 */
'use strict';

const SCREEN = window.devicePixelRatio || 1;
const STROKE = { s: 2, m: 4, l: 8 };
const FONT = { s: 16, m: 24, l: 40 };
const BLOCK = 12; // Blur block size in CSS px: large, so text under it can't be read back
const FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const CANVAS_BG = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim() || '#0f172a';
const ACCENT = '#3b82f6';
const TOOL_KEYS = { v: 'select', h: 'hand', c: 'crop', r: 'box', a: 'arrow', t: 'text', b: 'blur', x: 'redact' };
const NAMES = {
  select: 'Select', hand: 'Hand', crop: 'Crop', box: 'Box', arrow: 'Arrow', text: 'Text',
  blur: 'Blur', redact: 'Redact', image: 'Image', frame: 'Frame',
};
const HINTS = {
  select: 'Click an item to select it, drag to move it, drag its handles to resize. Delete removes it. Double-click text to change it.',
  hand: 'Drag to move around the board. Scroll to pan, ⌘/Ctrl + scroll or pinch to zoom.',
  crop: 'Drag to set the frame, or drag its handles. Only what is inside the frame is copied or downloaded.',
  box: 'Drag to draw a box.',
  arrow: 'Drag from the tail to the tip.',
  text: 'Click to type, Enter to finish.',
  blur: 'Drag over an area to pixelate everything under it.',
  redact: 'Drag over an area to black it out.',
};

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const board = $('board');

let doc = null;            // { id, name, capture, unit, created, updated, frame, items, thumb }
const images = new Map();  // asset id → { blob, bitmap }
const storedAssets = new Set();
let saved = false;         // doc is in the store
let dirty = false;
let saveTimer = null;
let saving = Promise.resolve();
let past = [];             // Undo snapshots
let future = [];
let lastKey = null;        // Changes with the same key (dragging the color picker) are one undo step
let selectedId = null;     // item id, 'frame' or null
let hoverId = null;
let tool = 'select';
let style = { color: '#ef4444', size: 'm', dash: 'solid' };
let view = { x: 0, y: 0, scale: 1 }; // board point at the canvas's top-left; CSS px per capture CSS px
let gesture = null;
let draft = null;          // Item being drawn, or { type: 'crop', x, y, w, h }
let editing = null;        // Text being typed
let spaceDown = false;
let settings = { format: 'png', quality: 95 };
let labelBox = null;       // Frame label, in CSS px, for clicking it

const newId = () => crypto.randomUUID();
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const rectBetween = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });

// ─── Coordinates ────────────────────────────────────────────────────────────

/** Canvas pixels per board pixel. */
const k = () => (view.scale * SCREEN) / doc.unit;
const cssPoint = (event) => {
  const box = board.getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
};
const toWorld = (p) => ({ x: view.x + (p.x * SCREEN) / k(), y: view.y + (p.y * SCREEN) / k() });
const toCss = (p) => ({ x: ((p.x - view.x) * k()) / SCREEN, y: ((p.y - view.y) * k()) / SCREEN });
/** A distance of `css` CSS px on screen, in board pixels. */
const onScreen = (css) => (css * SCREEN) / k();

// ─── Items ──────────────────────────────────────────────────────────────────

const strokeWidth = (item) => STROKE[item.size] * doc.unit;
const fontPx = (item) => FONT[item.size] * doc.unit;
const fontOf = (item) => `600 ${fontPx(item)}px ${FAMILY}`;
const measurer = new OffscreenCanvas(1, 1).getContext('2d');

function bounds(item) {
  if (item.type === 'arrow') return rectBetween({ x: item.x1, y: item.y1 }, { x: item.x2, y: item.y2 });
  if (item.type === 'text') {
    measurer.font = fontOf(item);
    return { x: item.x, y: item.y, w: measurer.measureText(item.text).width, h: fontPx(item) * 1.2 };
  }
  return { x: item.x, y: item.y, w: item.w, h: item.h };
}

/** Black or white, whichever stands out from the text color, for the text's outline. */
function outlineFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#000000' : '#ffffff';
}

function applyStroke(ctx, item) {
  const w = strokeWidth(item);
  ctx.lineWidth = w;
  ctx.strokeStyle = ctx.fillStyle = item.color;
  ctx.lineJoin = 'round';
  ctx.lineCap = item.dash === 'dotted' || item.type === 'arrow' ? 'round' : 'butt';
  ctx.setLineDash(item.dash === 'dashed' ? [w * 3, w * 2] : item.dash === 'dotted' ? [0, w * 2] : []);
  return w;
}

function drawArrow(ctx, item) {
  const w = applyStroke(ctx, item);
  const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
  const length = Math.hypot(item.x2 - item.x1, item.y2 - item.y1);
  const head = Math.min(10 * doc.unit + w * 2.75, length);
  // The shaft stops inside the head, so its end doesn't poke out of the tip.
  const shaft = Math.max(0, length - head * 0.8);
  ctx.beginPath();
  ctx.moveTo(item.x1, item.y1);
  ctx.lineTo(item.x1 + Math.cos(angle) * shaft, item.y1 + Math.sin(angle) * shaft);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(item.x2, item.y2);
  ctx.lineTo(item.x2 - head * Math.cos(angle - 0.45), item.y2 - head * Math.sin(angle - 0.45));
  ctx.lineTo(item.x2 - head * Math.cos(angle + 0.45), item.y2 - head * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

/** Pixelates what is already drawn under the rect, in this canvas's own pixels. */
function pixelate(ctx, r) {
  const t = ctx.getTransform();
  const x0 = Math.max(0, Math.round(t.a * r.x + t.e));
  const y0 = Math.max(0, Math.round(t.d * r.y + t.f));
  const x1 = Math.min(ctx.canvas.width, Math.round(t.a * (r.x + r.w) + t.e));
  const y1 = Math.min(ctx.canvas.height, Math.round(t.d * (r.y + r.h) + t.f));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w < 1 || h < 1) return;
  const block = Math.max(2, BLOCK * doc.unit * t.a);
  const tw = Math.max(1, Math.round(w / block));
  const th = Math.max(1, Math.round(h / block));
  // Halve step by step: one big downscale only samples a pixel or two per block, which can keep
  // a sharp edge (or a letter) intact; each halving averages 2 × 2, so blocks end up averaged.
  let small = ctx.canvas;
  let sx = x0, sy = y0, sw = w, sh = h;
  while (sw > tw || sh > th) {
    const next = new OffscreenCanvas(Math.max(tw, Math.ceil(sw / 2)), Math.max(th, Math.ceil(sh / 2)));
    next.getContext('2d').drawImage(small, sx, sy, sw, sh, 0, 0, next.width, next.height);
    small = next;
    sx = sy = 0;
    sw = next.width;
    sh = next.height;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, sx, sy, sw, sh, x0, y0, w, h);
}

function drawItem(ctx, item) {
  ctx.save();
  if (item.type === 'image') {
    const image = images.get(item.asset);
    if (image) ctx.drawImage(image.bitmap, item.x, item.y, item.w, item.h);
  } else if (item.type === 'box') {
    applyStroke(ctx, item);
    ctx.strokeRect(item.x, item.y, item.w, item.h);
  } else if (item.type === 'arrow') {
    drawArrow(ctx, item);
  } else if (item.type === 'text') {
    ctx.font = fontOf(item);
    ctx.textBaseline = 'top';
    ctx.lineWidth = fontPx(item) / 5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = outlineFor(item.color);
    ctx.strokeText(item.text, item.x, item.y);
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x, item.y);
  } else if (item.type === 'blur') {
    pixelate(ctx, item);
  } else if (item.type === 'redact') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(item.x, item.y, item.w, item.h);
  }
  ctx.restore();
}

function makeItem(type, id, a, b) {
  if (type === 'arrow') return { id, type, x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...style };
  const r = rectBetween(a, b);
  return type === 'box' ? { id, type, ...r, ...style } : { id, type, ...r };
}

const findItem = (id) => doc.items.find((item) => item.id === id);
/** What is selected, with the frame as a pseudo item. */
function selection() {
  if (selectedId === 'frame') return { type: 'frame', ...doc.frame };
  return (selectedId && findItem(selectedId)) || null;
}

function distanceToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = dx || dy ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const inside = (p, r, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;

/** The topmost item under a board point. A box is hit on its line only, so whatever it surrounds stays clickable. */
function hitItem(p, onlyType) {
  const tol = onScreen(5);
  for (let i = doc.items.length - 1; i >= 0; i--) {
    const item = doc.items[i];
    if (onlyType && item.type !== onlyType) continue;
    if (item.type === 'box') {
      const pad = strokeWidth(item) / 2 + tol;
      const inner = { x: item.x + pad, y: item.y + pad, w: item.w - 2 * pad, h: item.h - 2 * pad };
      if (inside(p, item, pad) && !(inner.w > 0 && inner.h > 0 && inside(p, inner))) return item;
    } else if (item.type === 'arrow') {
      if (distanceToSegment(p, { x: item.x1, y: item.y1 }, { x: item.x2, y: item.y2 }) <= strokeWidth(item) / 2 + tol) return item;
    } else if (inside(p, bounds(item), item.type === 'image' ? 0 : tol)) {
      return item;
    }
  }
  return null;
}

/** Resize handles of the selection, in board pixels. Images keep their shape, so they only get corners. */
function handlesOf(sel) {
  if (!sel || sel.type === 'text') return [];
  if (sel.type === 'arrow') return [{ name: 'p1', x: sel.x1, y: sel.y1 }, { name: 'p2', x: sel.x2, y: sel.y2 }];
  const { x, y, w, h } = sel;
  const corners = [
    { name: 'nw', x, y }, { name: 'ne', x: x + w, y },
    { name: 'se', x: x + w, y: y + h }, { name: 'sw', x, y: y + h },
  ];
  if (sel.type === 'image') return corners;
  return [...corners,
    { name: 'n', x: x + w / 2, y }, { name: 'e', x: x + w, y: y + h / 2 },
    { name: 's', x: x + w / 2, y: y + h }, { name: 'w', x, y: y + h / 2 }];
}

function hitHandle(sel, css) {
  return handlesOf(sel).find((h) => {
    const at = toCss(h);
    return Math.abs(at.x - css.x) <= 6 && Math.abs(at.y - css.y) <= 6;
  }) || null;
}

const CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', p1: 'move', p2: 'move' };

function resized(orig, handle, d, keepShape) {
  const right = orig.x + orig.w;
  const bottom = orig.y + orig.h;
  if (keepShape) {
    const w = Math.max(onScreen(8), handle.includes('w') ? right - (orig.x + d.x) : orig.w + d.x);
    const h = (w * orig.h) / orig.w;
    return { x: handle.includes('w') ? right - w : orig.x, y: handle.includes('n') ? bottom - h : orig.y, w, h };
  }
  let l = orig.x, t = orig.y, r = right, b = bottom;
  if (handle.includes('w')) l += d.x;
  if (handle.includes('e')) r += d.x;
  if (handle.includes('n')) t += d.y;
  if (handle.includes('s')) b += d.y;
  const out = rectBetween({ x: l, y: t }, { x: r, y: b });
  return { ...out, w: Math.max(out.w, 1), h: Math.max(out.h, 1) };
}

const roundRect = (r) => {
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  return { x, y, w: Math.max(1, Math.round(r.x + r.w) - x), h: Math.max(1, Math.round(r.y + r.h) - y) };
};

// ─── Rendering ──────────────────────────────────────────────────────────────

let checker = null;
function checkerPattern(ctx) {
  if (checker) return checker;
  const size = Math.round(8 * SCREEN);
  const tile = new OffscreenCanvas(size * 2, size * 2);
  const t = tile.getContext('2d');
  t.fillStyle = '#0f172a';
  t.fillRect(0, 0, size * 2, size * 2);
  t.fillStyle = '#1e293b';
  t.fillRect(0, 0, size, size);
  t.fillRect(size, size, size, size);
  return (checker = ctx.createPattern(tile, 'repeat'));
}

let frameRequest = 0;
const requestRender = () => { frameRequest ||= requestAnimationFrame(render); };

function render() {
  frameRequest = 0;
  const ctx = board.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, board.width, board.height);
  if (!doc) return;
  const s = k();
  const f = doc.frame;
  const fx = (f.x - view.x) * s;
  const fy = (f.y - view.y) * s;
  ctx.fillStyle = checkerPattern(ctx);
  ctx.fillRect(fx, fy, f.w * s, f.h * s);

  ctx.setTransform(s, 0, 0, s, -view.x * s, -view.y * s);
  for (const item of doc.items) if (item.id !== editing?.item.id) drawItem(ctx, item);
  if (draft && draft.type !== 'crop') drawItem(ctx, draft);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawOverlay(ctx, s);
}

/** Frame outline and label, hover and selection outlines, handles, all in screen pixels. */
function drawOverlay(ctx, s) {
  const px = (v) => Math.round(v) + 0.5;
  const toDev = (r) => ({ x: (r.x - view.x) * s, y: (r.y - view.y) * s, w: r.w * s, h: r.h * s });
  const f = toDev(doc.frame);
  const frameOn = selectedId === 'frame' || hoverId === 'frame';

  ctx.lineWidth = 1;
  ctx.strokeStyle = frameOn ? ACCENT : 'rgba(255, 255, 255, 0.14)';
  ctx.strokeRect(px(f.x), px(f.y), Math.round(f.w), Math.round(f.h));
  ctx.font = `500 ${11 * SCREEN}px ${FAMILY}`;
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = frameOn ? ACCENT : '#a3a3a3';
  const label = `Frame  ${doc.frame.w} × ${doc.frame.h}`;
  ctx.fillText(label, f.x, f.y - 6 * SCREEN);
  labelBox = { x: f.x / SCREEN, y: f.y / SCREEN - 22, w: ctx.measureText(label).width / SCREEN, h: 20 };

  if (draft?.type === 'crop') {
    const r = toDev(draft);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.rect(0, 0, board.width, board.height);
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill('evenodd');
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = SCREEN;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }

  const outline = (item, width) => {
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = width * SCREEN;
    ctx.setLineDash([]);
    if (item.type === 'arrow') {
      ctx.beginPath();
      ctx.moveTo((item.x1 - view.x) * s, (item.y1 - view.y) * s);
      ctx.lineTo((item.x2 - view.x) * s, (item.y2 - view.y) * s);
      ctx.stroke();
    } else if (item.type !== 'frame') {
      const r = toDev(bounds(item));
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  };

  const hovered = hoverId && hoverId !== selectedId && hoverId !== 'frame' && findItem(hoverId);
  if (hovered && !gesture) outline(hovered, 1.5);

  const sel = !draft && selection();
  if (!sel) return;
  outline(sel, 1);
  const size = 8 * SCREEN;
  for (const h of handlesOf(sel)) {
    const x = (h.x - view.x) * s;
    const y = (h.y - view.y) * s;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = SCREEN;
    ctx.beginPath();
    if (sel.type === 'arrow') ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    else ctx.rect(x - size / 2, y - size / 2, size, size);
    ctx.fill();
    ctx.stroke();
  }
  if (sel.type !== 'arrow' && sel.type !== 'text') {
    // Size badge under the selection.
    const r = toDev(sel);
    const text = `${Math.round(sel.w)} × ${Math.round(sel.h)}`;
    ctx.font = `600 ${11 * SCREEN}px ${FAMILY}`;
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 12 * SCREEN;
    const x = r.x + r.w / 2 - w / 2;
    const y = r.y + r.h + 10 * SCREEN;
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 18 * SCREEN, 4 * SCREEN);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x + 6 * SCREEN, y + 9 * SCREEN);
  }
}

// ─── View ───────────────────────────────────────────────────────────────────

function resizeBoard() {
  const box = board.getBoundingClientRect();
  board.width = Math.max(1, Math.round(box.width * SCREEN));
  board.height = Math.max(1, Math.round(box.height * SCREEN));
  render();
}

function zoomTo(scale, at) {
  const box = board.getBoundingClientRect();
  const p = at || { x: box.width / 2, y: box.height / 2 };
  const before = toWorld(p);
  view.scale = clamp(scale, 0.05, 32);
  view.x = before.x - onScreen(p.x);
  view.y = before.y - onScreen(p.y);
  if (editing) editing.finish(true);
  updateZoom();
  requestRender();
}

/** Fits the frame and every item into the board, never above `max`. */
function zoomToFit(max = 32) {
  const all = [doc.frame, ...doc.items.map(bounds)];
  const l = Math.min(...all.map((r) => r.x));
  const t = Math.min(...all.map((r) => r.y));
  const r = Math.max(...all.map((b) => b.x + b.w));
  const b = Math.max(...all.map((b) => b.y + b.h));
  const box = board.getBoundingClientRect();
  const pad = 80;
  const fit = Math.min((box.width - pad * 2) / ((r - l) / doc.unit), (box.height - pad * 2) / ((b - t) / doc.unit));
  view.scale = clamp(Math.min(fit, max), 0.05, 32);
  view.x = (l + r) / 2 - onScreen(box.width / 2);
  view.y = (t + b) / 2 - onScreen(box.height / 2);
  updateZoom();
  requestRender();
}

function updateZoom() {
  $('zoomLabel').textContent = `${Math.round(view.scale * 100)}%`;
}

// ─── Changes, undo, saving ──────────────────────────────────────────────────

const snapshot = () => JSON.stringify({ frame: doc.frame, items: doc.items });

function restore(snap) {
  const state = JSON.parse(snap);
  doc.frame = state.frame;
  doc.items = state.items;
  if (selectedId && selectedId !== 'frame' && !findItem(selectedId)) selectedId = null;
}

function pushUndo(before) {
  past.push(before);
  if (past.length > 200) past.shift();
  future = [];
}

/** Applies `fn` as one undoable edit; edits sharing `key` back to back are one step. */
function change(fn, key = null) {
  if (!key || key !== lastKey) pushUndo(snapshot());
  lastKey = key;
  fn();
  changed();
}

function changed() {
  updateUi();
  requestRender();
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}

function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  lastKey = null;
  changed();
}

function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  lastKey = null;
  changed();
}

/** Renders what's inside the frame. */
function renderFrame(scale = 1, background = null) {
  const f = doc.frame;
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(f.w * scale)), Math.max(1, Math.round(f.h * scale)));
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.setTransform(scale, 0, 0, scale, -f.x * scale, -f.y * scale);
  for (const item of doc.items) drawItem(ctx, item);
  return canvas;
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = null;
  saving = saving.then(write).catch((error) => {
    dirty = true;
    console.error('Element Snapper: saving the edit failed', error);
    showToast(`Couldn't save this edit: ${error.message}`, 'error');
  });
  return saving;
}

async function write() {
  if (!dirty) return;
  dirty = false;
  const used = new Set(doc.items.filter((item) => item.type === 'image').map((item) => item.asset));
  const added = [...used].filter((id) => !storedAssets.has(id) && images.has(id)).map((id) => ({ id, doc: doc.id, blob: images.get(id).blob }));
  const removed = [...storedAssets].filter((id) => !used.has(id));
  const thumbScale = Math.min(1, 480 / doc.frame.w, 360 / doc.frame.h);
  doc.thumb = await renderFrame(thumbScale).convertToBlob({ type: 'image/webp', quality: 0.8 });
  doc.updated = Date.now();
  await EditorStore.saveDoc({ ...doc }, added, removed);
  for (const asset of added) storedAssets.add(asset.id);
  for (const id of removed) storedAssets.delete(id);
  if (!saved) {
    saved = true;
    history.replaceState(null, '', `#doc=${doc.id}`);
  }
}

window.addEventListener('beforeunload', (event) => {
  if (dirty) event.preventDefault();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && dirty) save();
});

// ─── Selection, tools, style controls ────────────────────────────────────────

function select(id) {
  selectedId = id;
  lastKey = null;
  updateUi();
  requestRender();
}

function setTool(name) {
  if (editing) editing.finish(true);
  tool = name;
  for (const button of document.querySelectorAll('[data-tool]')) button.setAttribute('aria-pressed', String(button.dataset.tool === name));
  // A drawing tool shows its own style in the tool bar, not the last selection's.
  if (name === 'crop') selectedId = 'frame';
  else if (name !== 'select' || selectedId === 'frame') selectedId = null;
  updateUi();
  updateCursor();
  requestRender();
}

const styled = (type) => type === 'box' || type === 'arrow' || type === 'text';

function updateUi() {
  $('undo').disabled = !past.length;
  $('redo').disabled = !future.length;
  if (!doc) return;
  const sel = selection();
  const type = sel ? sel.type : tool;
  const values = sel && styled(sel.type) ? sel : style;
  $('designTitle').textContent = NAMES[type];
  $('designInfo').textContent = sel && sel.type !== 'arrow' && sel.type !== 'text'
    ? `${Math.round(sel.w)} × ${Math.round(sel.h)} px` : '';
  $('colorSection').hidden = !styled(type);
  $('sizeSection').hidden = !styled(type);
  $('dashSection').hidden = !(type === 'box' || type === 'arrow');
  $('sizeLabel').textContent = type === 'text' ? 'Text size' : 'Stroke';
  for (const b of document.querySelectorAll('[data-color]')) b.setAttribute('aria-pressed', String(b.dataset.color === values.color));
  $('customSwatch').classList.toggle('picked', !document.querySelector(`[data-color="${values.color}"]`));
  $('customColor').value = values.color;
  for (const b of document.querySelectorAll('[data-size]')) b.setAttribute('aria-pressed', String(b.dataset.size === values.size));
  for (const b of document.querySelectorAll('[data-dash]')) b.setAttribute('aria-pressed', String(b.dataset.dash === values.dash));
  $('deleteBtn').hidden = !sel || sel.type === 'frame';
  $('designHint').textContent = sel ? (sel.type === 'frame' ? HINTS.crop : HINTS.select) : HINTS[tool];
}

/** Sets a style value on the selected item (if it has one) and as the default for new items. */
function setStyle(key, value, coalesce) {
  style = { ...style, [key]: value };
  chrome.storage.local.set({ editorStyle: style });
  const sel = selection();
  if (sel && styled(sel.type) && sel[key] !== value) change(() => { findItem(sel.id)[key] = value; }, coalesce ? `${sel.id}:${key}` : null);
  else updateUi();
}

for (const b of document.querySelectorAll('[data-color]')) b.addEventListener('click', () => setStyle('color', b.dataset.color));
$('customColor').addEventListener('input', (e) => setStyle('color', e.target.value, true));
for (const b of document.querySelectorAll('[data-size]')) b.addEventListener('click', () => setStyle('size', b.dataset.size));
for (const b of document.querySelectorAll('[data-dash]')) b.addEventListener('click', () => setStyle('dash', b.dataset.dash));
for (const b of document.querySelectorAll('[data-tool]')) b.addEventListener('click', () => setTool(b.dataset.tool));

function deleteSelected() {
  const sel = selection();
  if (!sel || sel.type === 'frame') return;
  change(() => { doc.items = doc.items.filter((item) => item.id !== sel.id); });
  selectedId = null;
  updateUi();
}
$('deleteBtn').addEventListener('click', deleteSelected);

function updateCursor(css) {
  if (gesture?.kind === 'pan') return void (board.style.cursor = 'grabbing');
  if (spaceDown || tool === 'hand') return void (board.style.cursor = 'grab');
  const handle = css && (tool === 'select' || tool === 'crop') && hitHandle(selection(), css);
  if (handle) return void (board.style.cursor = CURSORS[handle.name]);
  board.style.cursor = tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair';
}

// ─── Pointer ────────────────────────────────────────────────────────────────

const onLabel = (css) => labelBox && inside(css, labelBox);

board.addEventListener('pointerdown', (event) => {
  if (!doc) return;
  if (editing) editing.finish(true);
  const css = cssPoint(event);
  const at = toWorld(css);
  const before = snapshot();
  board.focus({ preventScroll: true });

  if (event.button === 1 || (event.button === 0 && (spaceDown || tool === 'hand'))) {
    event.preventDefault();
    gesture = { kind: 'pan', from: css, view: { ...view } };
  } else if (event.button !== 0) {
    return;
  } else if (tool === 'select' || tool === 'crop') {
    const sel = selection();
    const handle = hitHandle(sel, css);
    if (handle) {
      gesture = { kind: 'resize', handle: handle.name, from: at, orig: { ...sel }, before };
    } else if (tool === 'crop') {
      gesture = { kind: 'crop', from: at };
      draft = { type: 'crop', x: at.x, y: at.y, w: 0, h: 0 };
    } else if (onLabel(css)) {
      select('frame');
      gesture = { kind: 'move', from: at, orig: { type: 'frame', ...doc.frame }, before };
    } else {
      const item = hitItem(at);
      select(item ? item.id : null);
      if (item) gesture = { kind: 'move', from: at, orig: { ...item }, before };
    }
  } else if (tool === 'text') {
    event.preventDefault(); // Keeps the new field focused
    editText(hitItem(at, 'text'), at);
    return;
  } else {
    gesture = { kind: 'draw', from: at, id: newId() };
    draft = makeItem(tool, gesture.id, at, at);
  }
  if (gesture) board.setPointerCapture(event.pointerId);
  updateCursor(css);
});

board.addEventListener('pointermove', (event) => {
  if (!doc) return;
  const css = cssPoint(event);
  if (!gesture) {
    const id = tool === 'select' ? (onLabel(css) ? 'frame' : hitItem(toWorld(css))?.id || null) : null;
    if (id !== hoverId) {
      hoverId = id;
      requestRender();
    }
    updateCursor(css);
    return;
  }
  const at = toWorld(css);
  const g = gesture;
  const d = { x: at.x - (g.from?.x ?? 0), y: at.y - (g.from?.y ?? 0) };
  if (g.kind === 'pan') {
    view.x = g.view.x - onScreen(css.x - g.from.x);
    view.y = g.view.y - onScreen(css.y - g.from.y);
  } else if (g.kind === 'draw') {
    draft = makeItem(tool, g.id, g.from, at);
  } else if (g.kind === 'crop') {
    draft = { type: 'crop', ...rectBetween(g.from, at) };
  } else if (g.kind === 'move' || g.kind === 'resize') {
    const o = g.orig;
    let next;
    if (o.type === 'arrow') {
      const end1 = g.kind === 'move' || g.handle === 'p1';
      const end2 = g.kind === 'move' || g.handle === 'p2';
      next = { x1: o.x1 + (end1 ? d.x : 0), y1: o.y1 + (end1 ? d.y : 0), x2: o.x2 + (end2 ? d.x : 0), y2: o.y2 + (end2 ? d.y : 0) };
    } else if (g.kind === 'move') {
      next = { x: o.x + d.x, y: o.y + d.y };
    } else {
      next = resized(o, g.handle, d, o.type === 'image');
    }
    if (o.type === 'frame') doc.frame = roundRect({ ...doc.frame, ...next });
    else Object.assign(findItem(o.id), next);
    updateUi();
  }
  requestRender();
});

function endGesture(event, keep) {
  const g = gesture;
  if (!g) return;
  gesture = null;
  const MIN = onScreen(4);
  if (g.kind === 'draw') {
    const item = draft;
    draft = null;
    const big = item.type === 'arrow' ? Math.hypot(item.x2 - item.x1, item.y2 - item.y1) >= MIN : item.w >= MIN && item.h >= MIN;
    // The tool stays on for the next one, so it isn't selected: a style picked now is for the next shape.
    if (keep && big) change(() => doc.items.push(item));
  } else if (g.kind === 'crop') {
    const r = draft;
    draft = null;
    if (keep && r.w >= MIN && r.h >= MIN) change(() => { doc.frame = roundRect(r); });
    select('frame');
  } else if (g.kind === 'move' || g.kind === 'resize') {
    if (!keep) restore(g.before);
    else if (snapshot() !== g.before) {
      pushUndo(g.before);
      lastKey = null;
      changed();
    }
  }
  updateCursor(cssPoint(event));
  requestRender();
}

board.addEventListener('pointerup', (event) => endGesture(event, true));
board.addEventListener('pointercancel', (event) => endGesture(event, false));
board.addEventListener('pointerleave', () => {
  if (hoverId && !gesture) {
    hoverId = null;
    requestRender();
  }
});
board.addEventListener('dblclick', (event) => {
  if (tool !== 'select' || !doc) return;
  const item = hitItem(toWorld(cssPoint(event)), 'text');
  if (item) editText(item);
});

stage.addEventListener('wheel', (event) => {
  if (!doc) return;
  event.preventDefault();
  if (event.ctrlKey || event.metaKey) {
    // Pinch on a trackpad arrives as ctrl + wheel with small steps.
    zoomTo(view.scale * Math.exp(-clamp(event.deltaY, -50, 50) * 0.01), cssPoint(event));
    return;
  }
  const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
  const dy = event.shiftKey && !event.deltaX ? 0 : event.deltaY;
  if (editing) editing.finish(true);
  view.x += onScreen(dx);
  view.y += onScreen(dy);
  requestRender();
}, { passive: false });

// ─── Text ───────────────────────────────────────────────────────────────────

/** A field over the board: Enter or clicking away keeps the text, Escape drops the change. */
function editText(existing, at) {
  const item = existing || { id: newId(), type: 'text', x: at.x, y: at.y, text: '', color: style.color, size: style.size };
  const pos = toCss(item);
  const input = document.createElement('input');
  input.className = 'text-input';
  input.setAttribute('aria-label', 'Text');
  input.value = item.text;
  input.style.left = `${pos.x}px`;
  input.style.top = `${pos.y}px`;
  input.style.fontSize = `${(fontPx(item) * k()) / SCREEN}px`;
  input.style.color = item.color;
  const fit = () => { input.style.width = `${Math.max(2, input.value.length + 1)}ch`; };
  fit();
  stage.appendChild(input);
  input.focus();
  input.select();

  let done = false;
  const finish = (keep) => {
    if (done) return;
    done = true;
    editing = null;
    const text = input.value.trim();
    input.remove();
    if (keep && !existing && text) {
      change(() => doc.items.push({ ...item, text }));
    } else if (keep && existing && !text) {
      selectedId = existing.id;
      deleteSelected();
    } else if (keep && existing && text !== existing.text) {
      change(() => { findItem(existing.id).text = text; });
    }
    requestRender();
  };
  editing = { item, finish };
  input.addEventListener('input', fit);
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
  requestRender();
}

// ─── Images ─────────────────────────────────────────────────────────────────

/** Puts an image on the board, centered on `at` (default: the middle of the view), at its own pixel size. */
async function addImage(blob, at) {
  if (!blob.type.startsWith('image/')) return;
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    showToast("Couldn't read that image", 'error');
    return;
  }
  const asset = newId();
  images.set(asset, { blob, bitmap });
  const box = board.getBoundingClientRect();
  const c = at || toWorld({ x: box.width / 2, y: box.height / 2 });
  const item = { id: newId(), type: 'image', asset, x: Math.round(c.x - bitmap.width / 2), y: Math.round(c.y - bitmap.height / 2), w: bitmap.width, h: bitmap.height };
  change(() => doc.items.push(item));
  setTool('select');
  select(item.id);
}

document.addEventListener('paste', (event) => {
  if (!doc || event.target instanceof HTMLInputElement) return;
  const files = [...event.clipboardData.files].filter((file) => file.type.startsWith('image/'));
  if (!files.length) return;
  event.preventDefault();
  files.forEach((file) => addImage(file));
});

stage.addEventListener('dragover', (event) => {
  if (!doc || !event.dataTransfer.types.includes('Files')) return;
  event.preventDefault();
  stage.classList.add('dropping');
});
stage.addEventListener('dragleave', (event) => {
  if (!stage.contains(event.relatedTarget)) stage.classList.remove('dropping');
});
stage.addEventListener('drop', (event) => {
  stage.classList.remove('dropping');
  if (!doc) return;
  event.preventDefault();
  const at = toWorld(cssPoint(event));
  [...event.dataTransfer.files].forEach((file) => addImage(file, at));
});

const picker = $('picker');
function togglePicker(open = picker.hidden) {
  picker.hidden = !open;
  $('imageBtn').setAttribute('aria-expanded', String(open));
  if (open) fillPicker();
}

async function fillPicker() {
  const grid = $('pickerGrid');
  grid.replaceChildren();
  const { history = [] } = await chrome.storage.session.get('history');
  $('pickerEmpty').hidden = history.length > 0;
  for (const entry of [...history].reverse()) {
    const key = `capture:${entry.id}`;
    const dataUrl = (await chrome.storage.session.get(key))[key];
    if (!dataUrl) continue;
    const button = document.createElement('button');
    button.title = new Date(entry.timestamp).toLocaleString();
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `Capture from ${button.title}`;
    button.appendChild(img);
    button.addEventListener('click', async () => {
      togglePicker(false);
      addImage(await (await fetch(dataUrl)).blob());
    });
    grid.appendChild(button);
  }
}

$('imageBtn').addEventListener('click', () => togglePicker());
$('pickFile').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', (event) => {
  togglePicker(false);
  [...event.target.files].forEach((file) => addImage(file));
  event.target.value = '';
});
document.addEventListener('pointerdown', (event) => {
  if (!picker.hidden && !picker.contains(event.target) && !$('imageBtn').contains(event.target)) togglePicker(false);
});

// ─── Keyboard ───────────────────────────────────────────────────────────────

document.addEventListener('keydown', (event) => {
  if (!doc || event.target instanceof HTMLInputElement) return;
  const mod = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();
  if (mod && key === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  } else if (mod && key === 'y') {
    event.preventDefault();
    redo();
  } else if (mod && (key === '=' || key === '+')) {
    event.preventDefault();
    zoomTo(view.scale * 1.25);
  } else if (mod && key === '-') {
    event.preventDefault();
    zoomTo(view.scale / 1.25);
  } else if (event.shiftKey && event.code === 'Digit1') {
    zoomToFit();
  } else if (event.shiftKey && event.code === 'Digit0') {
    zoomTo(1);
  } else if (key === 'delete' || key === 'backspace') {
    event.preventDefault();
    deleteSelected();
  } else if (key === 'escape') {
    if (gesture && gesture.before) restore(gesture.before);
    gesture = draft = null;
    togglePicker(false);
    select(null);
  } else if (event.code === 'Space') {
    event.preventDefault();
    if (!spaceDown) {
      spaceDown = true;
      updateCursor();
    }
  } else if (!mod && !event.altKey && TOOL_KEYS[key]) {
    setTool(TOOL_KEYS[key]);
  }
});

document.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    spaceDown = false;
    updateCursor();
  }
});

$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);
$('zoomIn').addEventListener('click', () => zoomTo(view.scale * 1.25));
$('zoomOut').addEventListener('click', () => zoomTo(view.scale / 1.25));
$('zoomLabel').addEventListener('click', () => zoomToFit());

$('name').addEventListener('change', (event) => {
  doc.name = event.target.value.trim() || doc.name;
  event.target.value = doc.name;
  document.title = `${doc.name} · Element Snapper`;
  changed();
});
$('name').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === 'Escape') event.target.blur();
});

$('homeBtn').addEventListener('click', async () => {
  if (dirty) await save();
  location.href = 'home.html';
});

// ─── Output ─────────────────────────────────────────────────────────────────

let toastTimer = null;
function showToast(text, type = 'success') {
  const toast = $('toast');
  toast.textContent = text;
  toast.classList.toggle('error', type === 'error');
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500);
}

$('download').addEventListener('click', async () => {
  try {
    const jpg = settings.format === 'jpg';
    // JPEG has no transparency: what isn't covered becomes white, not black.
    const blob = await renderFrame(1, jpg ? '#ffffff' : null).convertToBlob(jpg ? { type: 'image/jpeg', quality: settings.quality / 100 } : { type: 'image/png' });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `element-snapper-edited_${stamp}.${jpg ? 'jpg' : 'png'}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    showToast('Download started');
  } catch (error) {
    showToast(`Download failed: ${error.message}`, 'error');
  }
});

$('copy').addEventListener('click', async () => {
  try {
    // The clipboard only takes PNG.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderFrame().convertToBlob({ type: 'image/png' }) })]);
    showToast('Copied to clipboard');
  } catch (error) {
    showToast(`Copy failed: ${error.message}`, 'error');
  }
});

// ─── Start ──────────────────────────────────────────────────────────────────

async function loadDoc(record) {
  const assets = await EditorStore.getAssets(record.id);
  await Promise.all(assets.map(async (asset) => {
    images.set(asset.id, { blob: asset.blob, bitmap: await createImageBitmap(asset.blob) });
    storedAssets.add(asset.id);
  }));
  saved = true;
  history.replaceState(null, '', `#doc=${record.id}`);
  return record;
}

/** A new, unsaved doc holding the capture. It is saved on its first edit. */
async function docFromCapture(captureId) {
  const key = `capture:${captureId}`;
  const stored = await chrome.storage.session.get([key, 'history']);
  if (!stored[key]) return null;
  const blob = await (await fetch(stored[key])).blob();
  const asset = newId();
  const bitmap = await createImageBitmap(blob);
  images.set(asset, { blob, bitmap });
  const entry = (stored.history || []).find((e) => e.id === captureId);
  const taken = entry ? new Date(entry.timestamp) : new Date();
  return {
    id: newId(),
    name: `Capture ${taken.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
    capture: captureId,
    // Captures come from this screen, so its scale is theirs too.
    unit: SCREEN,
    created: Date.now(),
    updated: Date.now(),
    frame: { x: 0, y: 0, w: bitmap.width, h: bitmap.height },
    items: [{ id: newId(), type: 'image', asset, x: 0, y: 0, w: bitmap.width, h: bitmap.height }],
  };
}

async function start() {
  const params = new URLSearchParams(location.hash.slice(1));
  const prefs = await chrome.storage.local.get(['format', 'quality', 'editorStyle']);
  settings = { format: prefs.format || 'png', quality: prefs.quality || 95 };
  if (prefs.editorStyle) style = { ...style, ...prefs.editorStyle };

  const docId = params.get('doc');
  const captureId = params.get('capture');
  let record = null;
  if (docId) {
    record = await EditorStore.getDoc(docId);
    if (!record) return void ($('message').textContent = 'This edit was deleted.');
    doc = await loadDoc(record);
  } else if (captureId) {
    // Pressing Edit again on the same capture goes back to that edit.
    record = (await EditorStore.listDocs()).find((d) => d.capture === captureId);
    doc = record ? await loadDoc(record) : await docFromCapture(captureId);
    if (!doc) return void ($('message').textContent = 'This capture is no longer in history. History is cleared when the browser closes.');
  } else {
    location.replace('home.html');
    return;
  }

  $('message').hidden = true;
  $('name').value = doc.name;
  $('name').disabled = $('copy').disabled = $('download').disabled = false;
  document.title = `${doc.name} · Element Snapper`;
  new ResizeObserver(resizeBoard).observe(board);
  resizeBoard();
  zoomToFit(1);
  setTool('select');
  document.body.dataset.ready = 'true';
}

start().catch((error) => {
  console.error('Element Snapper: editor failed to load', error);
  $('message').textContent = `Couldn't open this edit: ${error.message}`;
});
