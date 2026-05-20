// js/core/chartStore.js
// IndexedDB-backed chart records + one-time migration from legacy
// localStorage profiles. Zero dependencies.
//
// Record shape (canonical):
//   {
//     id:    string,
//     birth: { name, year, month, day, hour, minute, utcOffset,
//              latitude, longitude, location_name, timezone,
//              birth_time_known },
//     chart: object|null,      // optional cached natal chart
//     meta:  { is_primary, created_at, updated_at, tags, notes,
//              legacy_origin? },
//   }
//
// All write methods return a Promise. Read methods are async too;
// astrologyApp keeps a sync cache (legacy shape) for existing callers.

const DB_NAME    = 'ptol-astro';
const DB_VERSION = 1;
const STORE      = 'charts';
const LEGACY_KEY = 'ptol-astro-profiles';

let _dbPromise = null;

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function openDb() {
  if (!hasIndexedDb()) return Promise.reject(new Error('IndexedDB unavailable'));
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('byName',    'birth.name',      { unique: false });
        store.createIndex('byCreated', 'meta.created_at', { unique: false });
        store.createIndex('byPrimary', 'meta.is_primary', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(mode) {
  return openDb().then(db => db.transaction(STORE, mode).objectStore(STORE));
}

function asPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function saveChart(record) {
  const store = await tx('readwrite');
  record.meta = {
    ...(record.meta || {}),
    created_at: record.meta?.created_at ?? Date.now(),
    updated_at: Date.now(),
  };
  if (!record.id) record.id = generateId();
  await asPromise(store.put(record));
  return record;
}

export async function loadAllCharts() {
  const store = await tx('readonly');
  const out = await asPromise(store.getAll());
  return Array.isArray(out) ? out : [];
}

export async function loadChart(id) {
  const store = await tx('readonly');
  return asPromise(store.get(id));
}

export async function deleteChart(id) {
  const store = await tx('readwrite');
  return asPromise(store.delete(id));
}

export async function setPrimaryChart(id) {
  const all = await loadAllCharts();
  for (const r of all) {
    if (r.meta?.is_primary && r.id !== id) {
      r.meta.is_primary = false;
      await saveChart(r);
    }
  }
  const target = await loadChart(id);
  if (target) {
    target.meta = { ...(target.meta || {}), is_primary: true };
    await saveChart(target);
  }
}

export async function getPrimaryChart() {
  const all = await loadAllCharts();
  return all.find(r => r.meta?.is_primary) || all[0] || null;
}

function generateId() {
  return 'chart_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
}

/**
 * One-time migration of legacy localStorage profiles into IndexedDB.
 * Idempotent: a flag in localStorage prevents duplicate runs.
 *
 * @returns {Promise<{ migrated: number, skipped?: boolean }>}
 */
export async function migrateLegacyProfiles() {
  const MIGRATED_KEY = 'ptol-astro-migrated-v1';
  if (typeof localStorage === 'undefined') return { migrated: 0, skipped: true };
  if (localStorage.getItem(MIGRATED_KEY) === 'true') return { migrated: 0, skipped: true };

  let raw;
  try { raw = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]'); }
  catch { raw = []; }

  if (!Array.isArray(raw) || raw.length === 0) {
    localStorage.setItem(MIGRATED_KEY, 'true');
    return { migrated: 0 };
  }

  let count = 0;
  for (const p of raw) {
    try {
      const [y, mo, d] = String(p.birthDate || '2000-01-01').split('-').map(Number);
      const [h, mi]    = String(p.birthTime || '12:00').split(':').map(Number);
      const record = {
        id: 'legacy_' + (p.id || count),
        birth: {
          name:               p.name || 'Unnamed',
          year:               y,
          month:              mo,
          day:                d,
          hour:               h,
          minute:             mi,
          utcOffset:          0,
          latitude:           parseFloat(p.birthLat) || 0,
          longitude:          parseFloat(p.birthLon) || 0,
          location_name:      p.place || '',
          timezone:           'UTC',
          birth_time_known:   !!p.birthTime,
        },
        meta: {
          is_primary:    false,
          created_at:    p.created || p.createdAt || Date.now(),
          tags:          [],
          notes:         '',
          legacy_origin: true,
        },
      };
      await saveChart(record);
      count++;
    } catch (_) { /* skip malformed entries */ }
  }
  // Don't delete the legacy key — keeps a rollback path.
  localStorage.setItem(MIGRATED_KEY, 'true');
  return { migrated: count };
}

// ─── Legacy-shape adapter ────────────────────────────────────────────────────
// Many existing callers expect the old localStorage profile shape:
//   { id, name, birthDate:'YYYY-MM-DD', birthTime:'HH:MM',
//     birthLat, birthLon, place, created }
// recordToLegacy() translates a modern record back. Use sparingly — new
// code should consume the modern shape.

export function recordToLegacy(record) {
  if (!record) return null;
  const b = record.birth || {};
  const pad = n => String(n).padStart(2, '0');
  return {
    id:         record.id,
    name:       b.name || '',
    birthDate:  `${b.year}-${pad(b.month)}-${pad(b.day)}`,
    birthTime:  b.birth_time_known === false ? '' : `${pad(b.hour)}:${pad(b.minute)}`,
    birthLat:   b.latitude,
    birthLon:   b.longitude,
    place:      b.location_name || '',
    created:    record.meta?.created_at || Date.now(),
    is_primary: !!record.meta?.is_primary,
  };
}

export function legacyToRecord(p) {
  const [y, mo, d] = String(p.birthDate || '2000-01-01').split('-').map(Number);
  const [h, mi]    = String(p.birthTime || '12:00').split(':').map(Number);
  return {
    id: p.id || ('chart_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36)),
    birth: {
      name:             p.name || 'Unnamed',
      year:             y,
      month:            mo,
      day:              d,
      hour:             h,
      minute:           mi,
      utcOffset:        0,
      latitude:         parseFloat(p.birthLat) || 0,
      longitude:        parseFloat(p.birthLon) || 0,
      location_name:    p.place || '',
      timezone:         'UTC',
      birth_time_known: !!p.birthTime,
    },
    meta: {
      is_primary: !!p.is_primary,
      created_at: p.created || Date.now(),
      tags:       [],
      notes:      '',
    },
  };
}
