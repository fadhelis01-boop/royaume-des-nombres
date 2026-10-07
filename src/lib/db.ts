// Petit magasin clé-valeur sur IndexedDB (fonctionne sur iPhone/Safari,
// Chrome, Edge, Firefox). Repli en mémoire si IndexedDB est indisponible
// (navigation privée stricte) : l'app reste utilisable, sans persistance.

const DB_NAME = "royaume-des-nombres";
const STORE = "kv";
let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, unknown>();

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const req = fn(db.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export async function dbGet<T>(key: string): Promise<T | undefined> {
  const v = await tx<T>("readonly", (s) => s.get(key) as IDBRequest<T>);
  return v === undefined ? (memory.get(key) as T | undefined) : v;
}

export async function dbSet(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  await tx("readwrite", (s) => s.put(value, key));
}

export async function dbDel(key: string): Promise<void> {
  memory.delete(key);
  await tx("readwrite", (s) => s.delete(key));
}

export async function dbKeys(prefix = ""): Promise<string[]> {
  const keys = ((await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) ?? []).map(String);
  const all = new Set([...keys, ...memory.keys()]);
  return [...all].filter((k) => k.startsWith(prefix));
}

// Demande au navigateur de ne pas purger les données (Safari purge
// sinon les sites non visités depuis 7 jours… sauf apps installées).
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignoré */
  }
  return false;
}
