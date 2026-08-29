// ================================================================
// API
// ================================================================

async function api(action, params = {}) {
  const url = new URL(SCRIPT_URL);
  url.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v);
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 15000); // 15 s hard cap

  try {
    const res  = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data.success === false && data.error) throw new Error(data.error);
    return data;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error('انتهت مهلة الاتصال');
    throw e;
  }
}

async function initLoad() {
  try {
    const [menuR, namesR, statusR, ordersR] = await Promise.all([
      api('getMenu'), api('getNames'), api('getStatus'), api('getOrders')
    ]);
    S.menu     = menuR.data;
    S.names    = namesR.data   || [];
    S.isLocked = statusR.locked;
    S.lockTime = statusR.lockTime;
    S.orders   = ordersR.data  || [];
    buildMenuFlat();
    return true;
  } catch (e) {
    return false;
  }
}

function buildMenuFlat() {
  S.menuFlat = [];
  Object.entries(S.menu).forEach(([cat, items]) => {
    items.forEach(item => {
      S.menuFlat.push({ id: S.menuFlat.length, name: item.name, price: item.price, category: cat });
    });
  });
}

async function cancelOrder(name) {
  return api('cancelOrder', { name });
}

function findPrice(name) {
  return (S.menuFlat.find(i => i.name === name) || {}).price || 0;
}
