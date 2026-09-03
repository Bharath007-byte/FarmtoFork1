import { buildSeedDb, type PlatformOrder, type SihDb } from "./seed";

const KEY = "f2f-sih-db";

export function loadSihDb(): SihDb {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SihDb;
      if (parsed?.farms?.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  const seed = buildSeedDb();
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

export function saveSihDb(db: SihDb) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export function pushOrder(order: PlatformOrder) {
  const db = loadSihDb();
  db.orders = [order, ...db.orders];
  saveSihDb(db);
  return db;
}
