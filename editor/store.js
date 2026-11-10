/**
 * Element Snapper - saved edits (IndexedDB, kept until the user deletes them)
 *
 *   docs   : { id, name, capture, unit, created, updated, frame, items, thumb }
 *   assets : { id, doc, blob }, one per image placed on a doc's board
 *
 * Shared by editor.html and home.html. Assets are their own records so saving
 * a doc after each edit doesn't rewrite its (possibly large) images.
 */
'use strict';

const EditorStore = (() => {
  let opening = null;
  const db = () => (opening ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('element-snapper', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('docs', { keyPath: 'id' });
      request.result.createObjectStore('assets', { keyPath: 'id' }).createIndex('doc', 'doc');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));

  /** Runs `work(stores)` in one transaction; resolves with its return value once committed. */
  async function run(mode, work) {
    const t = (await db()).transaction(['docs', 'assets'], mode);
    const result = work({ docs: t.objectStore('docs'), assets: t.objectStore('assets') });
    return new Promise((resolve, reject) => {
      t.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
      t.onerror = t.onabort = () => reject(t.error || new Error('Storage failed'));
    });
  }

  return {
    listDocs: () => run('readonly', (s) => s.docs.getAll()),
    getDoc: (id) => run('readonly', (s) => s.docs.get(id)),
    getAssets: (docId) => run('readonly', (s) => s.assets.index('doc').getAll(docId)),

    /** Writes the doc, adds `added` assets and drops the ids in `removed`. */
    saveDoc: (doc, added = [], removed = []) => run('readwrite', (s) => {
      s.docs.put(doc);
      for (const asset of added) s.assets.put(asset);
      for (const id of removed) s.assets.delete(id);
    }),

    deleteDoc: (id) => run('readwrite', (s) => {
      s.docs.delete(id);
      s.assets.index('doc').openKeyCursor(IDBKeyRange.only(id)).onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) return;
        s.assets.delete(cursor.primaryKey);
        cursor.continue();
      };
    }),
  };
})();
