/**
 * Element Snapper - Editor
 * Opened from the preview's Edit button as editor.html#<captureId>. Reads the
 * capture from chrome.storage.session (the preview history), lets the user
 * crop, draw boxes and arrows, add text, and blur or black out areas, then
 * copies or downloads the result. The history entry itself is left unchanged.
 *
 * Every edit is kept as an operation in the capture's own pixels and the image
 * is redrawn from the original, so Undo is just dropping the last one.
 */
'use strict';

const COLOR = '#ef4444';
// Captures come from this screen, so its scale is theirs too: a 3px line looks 3px.
const UNIT = window.devicePixelRatio || 1;
const MIN_DRAG = 4 * UNIT;

const $ = (id) => document.getElementById(id);
const frame = $('frame');
const view = $('view');
const sketch = $('sketch');

let source = null; // ImageBitmap of the capture
let ops = [];      // Edits, oldest first, in source pixels
let tool = 'crop';
let drag = null;
let savedOps = ops; // What was last copied or downloaded, to warn before losing edits
let settings = { format: 'png', quality: 95 };

// ─── Drawing ────────────────────────────────────────────────────────────────

const rectBetween = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });

/** The area every crop so far leaves, in source pixels. */
function cropArea() {
  const crop = ops.findLast((op) => op.type === 'crop');
  return crop || { x: 0, y: 0, w: source.width, h: source.height };
}

function drawArrow(ctx, { from, to }) {
  const head = 18 * UNIT;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  // The shaft stops inside the head, so its square end doesn't poke out of the tip.
  const shaft = Math.max(0, length - head * 0.8);
  ctx.lineWidth = 3 * UNIT;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(from.x + Math.cos(angle) * shaft, from.y + Math.sin(angle) * shaft);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle - 0.45), to.y - head * Math.sin(angle - 0.45));
  ctx.lineTo(to.x - head * Math.cos(angle + 0.45), to.y - head * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

const textFont = () => `600 ${20 * UNIT}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

/** Large blocks, so text under it can't be read back. */
function pixelate(ctx, { x, y, w, h }) {
  const block = 12 * UNIT;
  const small = new OffscreenCanvas(Math.max(1, Math.round(w / block)), Math.max(1, Math.round(h / block)));
  small.getContext('2d').drawImage(ctx.canvas, x, y, w, h, 0, 0, small.width, small.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, small.width, small.height, x, y, w, h);
  ctx.imageSmoothingEnabled = true;
}

function drawOp(ctx, op) {
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = COLOR;
  if (op.type === 'box') {
    ctx.lineWidth = 3 * UNIT;
    ctx.lineJoin = 'round';
    ctx.strokeRect(op.x, op.y, op.w, op.h);
  } else if (op.type === 'arrow') {
    drawArrow(ctx, op);
  } else if (op.type === 'text') {
    ctx.font = textFont();
    ctx.textBaseline = 'top';
    ctx.lineWidth = 4 * UNIT;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(op.text, op.x, op.y);
    ctx.fillText(op.text, op.x, op.y);
  } else if (op.type === 'blur') {
    pixelate(ctx, op);
  } else if (op.type === 'redact') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(op.x, op.y, op.w, op.h);
  }
  ctx.restore();
}

/** Redraws the image from the original and every edit. */
function render() {
  const all = new OffscreenCanvas(source.width, source.height);
  const ctx = all.getContext('2d');
  ctx.drawImage(source, 0, 0);
  for (const op of ops) if (op.type !== 'crop') drawOp(ctx, op);

  const crop = cropArea();
  view.width = sketch.width = crop.w;
  view.height = sketch.height = crop.h;
  view.getContext('2d').drawImage(all, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  view.style.width = `${crop.w / UNIT}px`;

  $('undo').disabled = !ops.length;
  $('size').textContent = `${crop.w} × ${crop.h}`;
}

/** The shape being dragged, drawn over the image until it is let go. */
function renderSketch() {
  const ctx = sketch.getContext('2d');
  ctx.clearRect(0, 0, sketch.width, sketch.height);
  if (!drag) return;
  const crop = cropArea();
  ctx.save();
  ctx.translate(-crop.x, -crop.y);
  const r = rectBetween(drag.from, drag.to);
  if (tool === 'crop') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(crop.x, crop.y, crop.w, crop.h);
    ctx.clearRect(r.x, r.y, r.w, r.h);
  } else if (tool === 'blur' || tool === 'redact') {
    ctx.fillStyle = tool === 'redact' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
  } else {
    drawOp(ctx, toOp());
  }
  if (tool !== 'arrow' && tool !== 'box') {
    ctx.setLineDash([6 * UNIT, 4 * UNIT]);
    ctx.lineWidth = UNIT;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();
}

function toOp() {
  if (tool === 'arrow') return { type: 'arrow', from: drag.from, to: drag.to };
  return { type: tool, ...rectBetween(drag.from, drag.to) };
}

// ─── Input ──────────────────────────────────────────────────────────────────

/** A pointer position in source pixels, kept inside the current crop. */
function toSource(event) {
  const box = sketch.getBoundingClientRect();
  const crop = cropArea();
  const x = ((event.clientX - box.left) / box.width) * crop.w;
  const y = ((event.clientY - box.top) / box.height) * crop.h;
  return { x: crop.x + Math.min(Math.max(x, 0), crop.w), y: crop.y + Math.min(Math.max(y, 0), crop.h) };
}

function addOp(op) {
  ops = [...ops, op];
  render();
}

sketch.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || !source) return;
  if (tool === 'text') {
    event.preventDefault(); // Keep the new field focused
    placeText(event);
    return;
  }
  sketch.setPointerCapture(event.pointerId);
  const point = toSource(event);
  drag = { from: point, to: point };
});

sketch.addEventListener('pointermove', (event) => {
  if (!drag) return;
  drag.to = toSource(event);
  renderSketch();
});

function endDrag(event, keep) {
  if (!drag) return;
  drag.to = toSource(event);
  const op = toOp();
  const big = tool === 'arrow' ? Math.hypot(op.to.x - op.from.x, op.to.y - op.from.y) >= MIN_DRAG : op.w >= MIN_DRAG && op.h >= MIN_DRAG;
  drag = null;
  renderSketch();
  if (keep && big) addOp(op);
}

sketch.addEventListener('pointerup', (event) => endDrag(event, true));
sketch.addEventListener('pointercancel', (event) => endDrag(event, false));

/** A field at the click; Enter or clicking away adds the text, Escape drops it. */
function placeText(event) {
  const at = toSource(event);
  const box = sketch.getBoundingClientRect();
  const crop = cropArea();
  const scale = box.width / crop.w; // CSS pixels per source pixel
  const input = document.createElement('input');
  input.className = 'text-input';
  input.setAttribute('aria-label', 'Text to add');
  input.style.left = `${(at.x - crop.x) * scale}px`;
  input.style.top = `${(at.y - crop.y) * scale}px`;
  input.style.fontSize = `${20 * UNIT * scale}px`;
  frame.appendChild(input);
  input.focus();

  let done = false;
  const finish = (keep) => {
    if (done) return;
    done = true;
    const text = input.value.trim();
    input.remove();
    if (keep && text) addOp({ type: 'text', x: at.x, y: at.y, text });
  };
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

function selectTool(name) {
  tool = name;
  for (const button of document.querySelectorAll('[data-tool]')) {
    button.setAttribute('aria-pressed', String(button.dataset.tool === name));
  }
  sketch.classList.toggle('text', name === 'text');
}

for (const button of document.querySelectorAll('[data-tool]')) {
  button.addEventListener('click', () => selectTool(button.dataset.tool));
}

function undo() {
  if (!ops.length) return;
  ops = ops.slice(0, -1);
  render();
}

$('undo').addEventListener('click', undo);
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undo();
  }
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

const toBlob = (type, quality) => new Promise((resolve, reject) => {
  view.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))), type, quality);
});

$('download').addEventListener('click', async () => {
  try {
    const jpg = settings.format === 'jpg';
    const blob = await toBlob(jpg ? 'image/jpeg' : 'image/png', jpg ? settings.quality / 100 : undefined);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `element-snapper-edited_${stamp}.${jpg ? 'jpg' : 'png'}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    savedOps = ops;
    showToast('Download started');
  } catch (error) {
    showToast(`Download failed: ${error.message}`, 'error');
  }
});

$('copy').addEventListener('click', async () => {
  try {
    // The clipboard only takes PNG.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob('image/png') })]);
    savedOps = ops;
    showToast('Copied to clipboard');
  } catch (error) {
    showToast(`Copy failed: ${error.message}`, 'error');
  }
});

window.addEventListener('beforeunload', (event) => {
  if (ops !== savedOps && ops.length) event.preventDefault();
});

// ─── Start ──────────────────────────────────────────────────────────────────

async function start() {
  const id = decodeURIComponent(location.hash.slice(1));
  const key = `capture:${id}`;
  const [stored, saved] = await Promise.all([chrome.storage.session.get(key), chrome.storage.local.get(['format', 'quality'])]);
  settings = { format: saved.format || 'png', quality: saved.quality || 95 };
  if (!stored[key]) {
    $('message').textContent = 'This capture is no longer in history. History is cleared when the browser closes.';
    return;
  }
  source = await createImageBitmap(await (await fetch(stored[key])).blob());
  render();
  $('message').hidden = true;
  frame.hidden = false;
  $('copy').disabled = $('download').disabled = false;
}

start().catch((error) => {
  console.error('Element Snapper: editor failed to load', error);
  $('message').textContent = `Couldn't open this capture: ${error.message}`;
});
