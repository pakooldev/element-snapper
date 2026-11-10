/**
 * Element Snapper - My edits
 * Every doc saved by the editor (store.js), newest first. A capture only shows
 * up here after something in it was edited.
 */
'use strict';

const grid = document.getElementById('grid');
const urls = [];

function when(time) {
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return 'Edited just now';
  if (minutes < 60) return `Edited ${minutes} min ago`;
  return `Edited ${new Date(time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
}

function card(doc) {
  const el = document.createElement('article');
  el.className = 'card';

  const link = document.createElement('a');
  link.href = `editor.html#doc=${encodeURIComponent(doc.id)}`;
  const thumb = document.createElement('span');
  thumb.className = 'thumb';
  if (doc.thumb) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(doc.thumb);
    img.alt = '';
    urls.push(img.src);
    thumb.appendChild(img);
  }
  const meta = document.createElement('span');
  meta.className = 'meta';
  const name = document.createElement('strong');
  name.textContent = doc.name;
  const info = document.createElement('span');
  info.textContent = `${when(doc.updated)} · ${doc.frame.w} × ${doc.frame.h}`;
  meta.append(name, info);
  link.append(thumb, meta);

  const remove = document.createElement('button');
  remove.className = 'remove';
  remove.title = remove.ariaLabel = `Delete ${doc.name}`;
  remove.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
  remove.addEventListener('click', async () => {
    if (!confirm(`Delete "${doc.name}"? This can't be undone.`)) return;
    try {
      await EditorStore.deleteDoc(doc.id);
      load();
    } catch (error) {
      const toast = document.getElementById('toast');
      toast.textContent = `Couldn't delete: ${error.message}`;
      toast.classList.add('visible', 'error');
      setTimeout(() => toast.classList.remove('visible'), 2500);
    }
  });

  el.append(link, remove);
  return el;
}

async function load() {
  const docs = (await EditorStore.listDocs()).sort((a, b) => b.updated - a.updated);
  urls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  grid.replaceChildren(...docs.map(card));
  document.getElementById('empty').hidden = docs.length > 0;
  document.getElementById('count').textContent = docs.length ? String(docs.length) : '';
  document.body.dataset.ready = 'true';
}

load();
// Back from the editor (bfcache) or saved in another tab.
window.addEventListener('pageshow', (event) => { if (event.persisted) load(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
