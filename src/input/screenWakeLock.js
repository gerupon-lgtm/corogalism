/** 傾き操作中の自動消灯を防ぐ。拒否・非対応でもゲームの開始を待たせない。 */
export function createScreenWakeLock({
  navigator: nav = globalThis.navigator,
  document: doc = globalThis.document,
  window: win = globalThis.window,
} = {}) {
  const supported = typeof nav?.wakeLock?.request === 'function';
  let active = false;
  let suspended = false;
  let disposed = false;
  let lock = null;
  let pending = null;
  let revision = 0;
  let lastError = null;
  const eligible = () => supported && active && !doc?.hidden && !suspended && !disposed;

  async function release(value) {
    if (!value || value.released) return;
    try { await value.release(); }
    catch { /* OS側で既に解除されていても進行を妨げない。 */ }
  }

  function sync() {
    if (!eligible()) {
      const previous = lock;
      lock = null;
      void release(previous);
      return pending ?? Promise.resolve();
    }
    if (lock && !lock.released) return Promise.resolve();
    if (pending) return pending;
    const requestedRevision = revision;
    lastError = null;
    pending = Promise.resolve().then(async () => {
      // 開始の直後に停止・非表示になった場合、要求自体を省く。
      if (!eligible()) return;
      try {
        const acquired = await nav.wakeLock.request('screen');
        // 要求が返るまでに一時停止した場合、遅れて取得したものも解除する。
        if (!eligible()) { await release(acquired); return; }
        lock = acquired;
        acquired.addEventListener('release', () => {
          if (lock === acquired) lock = null;
          // 省電力などOSによる解除を即座に取り直し続けない。
        }, { once: true });
      } catch (error) {
        lastError = error?.name ?? 'Error';
      }
    }).finally(() => {
      pending = null;
      // 解除を待つ間に再開した場合だけ、新しい状態でもう一度取り直す。
      if (revision !== requestedRevision && eligible() && !lock) void sync();
    });
    return pending;
  }

  function refresh() { revision += 1; return sync(); }
  const onVisibility = () => { void refresh(); };
  const onPageHide = () => { suspended = true; void refresh(); };
  const onPageShow = () => { suspended = false; void refresh(); };
  doc?.addEventListener('visibilitychange', onVisibility);
  win?.addEventListener('pagehide', onPageHide);
  win?.addEventListener('pageshow', onPageShow);

  return {
    setActive(value) {
      const next = Boolean(value);
      if (active === next || disposed) return pending ?? Promise.resolve();
      active = next;
      return refresh();
    },
    get state() {
      return { supported, active, held: Boolean(lock && !lock.released), pending: Boolean(pending), lastError };
    },
    dispose() {
      disposed = true;
      active = false;
      doc?.removeEventListener('visibilitychange', onVisibility);
      win?.removeEventListener('pagehide', onPageHide);
      win?.removeEventListener('pageshow', onPageShow);
      return refresh();
    },
  };
}
