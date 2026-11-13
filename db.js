const PlayBoxDB = (() => {
  const DB_NAME = 'PlayBoxDB';
  const DB_VERSION = 1;
  const STORE_META = 'meta';
  const STORE_STATS = 'stats';

  const DEFAULT_STATS = {
    tictactoe: { id: 'tictactoe', name: 'Neon Tic-Tac-Toe', wins: 0, losses: 0, draws: 0, p2Games: 0 },
    connect4:  { id: 'connect4',  name: 'Cyber Connect 4',  wins: 0, losses: 0, draws: 0, p2Games: 0 },
    memory:    { id: 'memory',    name: 'Emoji Flip Match', wins: 0, bestMoves: null, p2Games: 0 },
    snake:     { id: 'snake',     name: 'Neon Snake Arena', highScore: 0, gamesPlayed: 0, p2Games: 0 }
  };

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_STATS)) {
          db.createObjectStore(STORE_STATS, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function init() {
    const db = await open();
    const tx = db.transaction([STORE_META, STORE_STATS], 'readwrite');
    const metaStore = tx.objectStore(STORE_META);
    const statsStore = tx.objectStore(STORE_STATS);

    const profileReq = metaStore.get('profile');
    profileReq.onsuccess = () => {
      if (!profileReq.result) {
        metaStore.put({ key: 'profile', p1: 'Player 1', p2: 'Player 2', sound: true });
      }
    };

    Object.values(DEFAULT_STATS).forEach((item) => {
      const sReq = statsStore.get(item.id);
      sReq.onsuccess = () => {
        if (!sReq.result) statsStore.put(item);
      };
    });

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  async function getProfile() {
    const db = await open();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const req = tx.objectStore(STORE_META).get('profile');
      req.onsuccess = () => resolve(req.result || { key: 'profile', p1: 'Player 1', p2: 'Player 2', sound: true });
    });
  }

  async function saveProfile(updates) {
    const current = await getProfile();
    const updated = { ...current, ...updates, key: 'profile' };
    const db = await open();
    const tx = db.transaction(STORE_META, 'readwrite');
    tx.objectStore(STORE_META).put(updated);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(updated);
    });
  }

  async function getStat(gameId) {
    const db = await open();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_STATS, 'readonly');
      const req = tx.objectStore(STORE_STATS).get(gameId);
      req.onsuccess = () => resolve(req.result || DEFAULT_STATS[gameId]);
    });
  }

  async function getAllStats() {
    const db = await open();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_STATS, 'readonly');
      const req = tx.objectStore(STORE_STATS).getAll();
      req.onsuccess = () => resolve(req.result || Object.values(DEFAULT_STATS));
    });
  }

  async function updateStat(gameId, updaterFn) {
    const current = await getStat(gameId);
    const next = updaterFn({ ...current });
    const db = await open();
    const tx = db.transaction(STORE_STATS, 'readwrite');
    tx.objectStore(STORE_STATS).put(next);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(next);
    });
  }

  async function exportAll() {
    const profile = await getProfile();
    const stats = await getAllStats();
    return JSON.stringify({ app: 'PlayBox', exportedAt: new Date().toISOString(), profile, stats }, null, 2);
  }

  async function importAll(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (parsed.app !== 'PlayBox' || !Array.isArray(parsed.stats)) {
      throw new Error('Invalid PlayBox backup file');
    }
    const db = await open();
    const tx = db.transaction([STORE_META, STORE_STATS], 'readwrite');
    if (parsed.profile) {
      tx.objectStore(STORE_META).put({ ...parsed.profile, key: 'profile' });
    }
    parsed.stats.forEach((s) => {
      if (DEFAULT_STATS[s.id]) tx.objectStore(STORE_STATS).put(s);
    });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  async function resetAll() {
    const db = await open();
    const tx = db.transaction(STORE_STATS, 'readwrite');
    const store = tx.objectStore(STORE_STATS);
    Object.values(DEFAULT_STATS).forEach((item) => store.put(item));
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  return { init, getProfile, saveProfile, getStat, getAllStats, updateStat, exportAll, importAll, resetAll };
})();
