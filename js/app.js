// ================================================================
// MAIN APP LOGIC
// ================================================================

const S = {
  menu: {},
  menuFlat: [],
  names: [],
  orders: [],
  isLocked: false,
  lockTime: '',
  currentName: null,
  currentQty: {},
  mgrKey: null,
  orderedBy: null,
  editName: null,
  editQty: {},
  mgrRefreshTimer: null,
  isDirty: false,
  _serverOrdersCount: null   // kept fresh by poll; used for accurate delivery split
};

// ================================================================
// LAST ORDER — localStorage helpers
// Saves items + submit timestamp together under the same key.
// ================================================================
function _loKey(name) { return 'lo_' + normAr(name); }

function saveLastOrder(name, items) {
  try {
    const now  = new Date();
    const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('ar-EG', { weekday: 'long' });
    localStorage.setItem(_loKey(name), JSON.stringify({ items, time, date }));
  } catch(e) {}
}

function loadLastOrder(name) {
  try {
    const raw = localStorage.getItem(_loKey(name));
    if (!raw) return null;
    const data = JSON.parse(raw);
    const valid = (data.items || []).filter(item => {
      const mi = S.menuFlat.find(m => m.name === item.name);
      if (!mi) return false;
      item.price = mi.price;
      return true;
    });
    return valid.length ? { items: valid, date: data.date || null } : null;
  } catch(e) { return null; }
}

// Returns the stored submit time string for a name, or null.
function loadSubmitTime(name) {
  try {
    const raw = localStorage.getItem(_loKey(name));
    if (!raw) return null;
    return JSON.parse(raw).time || null;
  } catch(e) { return null; }
}

function showLastOrderPrompt(items, date) {
  // Update modal header to show how old the order is
  const hdrEl = document.querySelector('#loModal .modal-hdr h3');
  if (hdrEl) {
    hdrEl.textContent = date ? `🔁 طلبك من ${date}` : '🔁 نفس طلب المرة اللي فاتت؟';
  }

  const total  = items.reduce((s, i) => s + i.price * i.qty, 0);
  const people = Math.max(S._serverOrdersCount !== null ? S._serverOrdersCount : S.orders.length, 1);
  const del    = DELIVERY_FEE / people;
  document.getElementById('loBody').innerHTML =
    '<div style="padding:14px 16px 4px;">' +
    items.map(i =>
      '<div class="summary-row"><span><span class="qty-tag">×' + i.qty + '</span>' +
      h(i.name) + '</span><span>' + (i.price * i.qty) + ' جنيه</span></div>'
    ).join('') +
    '<div class="total-box" style="margin:12px 0 4px;">' +
    '<div class="trow"><span>إجمالي الطعام</span><span>' + total + ' جنيه</span></div>' +
    '<div class="trow" style="color:var(--grey);font-size:13px;"><span>توصيل (تقريبي)</span><span>' + del.toFixed(2) + ' جنيه</span></div>' +
    '<div class="trow grand"><span>إجماليك المتوقع</span><span>' + (total + del).toFixed(2) + ' جنيه</span></div>' +
    '</div></div>';
  document.getElementById('loModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLoModal() {
  document.getElementById('loModal').style.display = 'none';
  document.body.style.overflow = '';
}

// ================================================================
// USER STATUS POLL
// Polls getStatus every 10 s on user-facing screens.
// If the manager locks orders while a user is mid-session, they see
// a toast immediately instead of only finding out on submit.
// ================================================================
let _userPollTimer = null;

function startUserPoll() {
  if (_userPollTimer || S.isLocked) return;
  _userPollTimer = setInterval(async () => {
    const active = document.querySelector('.screen.active');
    const screenId = active ? active.id : null;
    if (!['screen-name', 'screen-order', 'screen-submitted'].includes(screenId)) return;
    try {
      const r = await api('getStatus');
      if (r.locked && !S.isLocked) {
        S.isLocked = true;
        S.lockTime = r.lockTime;
        stopUserPoll();
        showToast('🔒 الطلبات اتقفلت!');
        setTimeout(() => renderClosedScreen(S.currentName), 1200);
      }
      // Bug #8: Keep order count fresh for accurate delivery split on submitted screen
      if (typeof r.ordersCount === 'number') {
        S._serverOrdersCount = r.ordersCount;
      }
    } catch (e) {
      // Silently swallow poll errors — don't disrupt the user
    }
  }, 10000);
}

function stopUserPoll() {
  if (_userPollTimer) {
    clearInterval(_userPollTimer);
    _userPollTimer = null;
  }
}

/* ---------- INIT ---------- */
async function init() {
  showScreen('screen-loading');

  // Failsafe: if everything hangs past 20 s for any reason, show error instead of freezing
  const failsafe = setTimeout(() => renderErrorScreen(), 20000);

  try {
    const params   = new URLSearchParams(window.location.search);
    const isMgrMode = params.has(MGR_PARAM);

    const ok = await initLoad();
    clearTimeout(failsafe);

    if (!ok) {
      renderErrorScreen();
      return;
    }

    if (isMgrMode) {
      renderManagerLogin();
      return;
    }

    if (S.isLocked) {
      renderClosedScreen(null);
    } else {
      startUserPoll();
      renderNameScreen();
    }
  } catch (err) {
    clearTimeout(failsafe);
    renderErrorScreen();
  }
}

/* ---------- EVENT DELEGATION ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    // Confirm sheet
    case 'doConfirm':     doConfirm();     break;
    case 'cancelConfirm': cancelConfirm(); break;

    // Name screen
    case 'proceedWithName': proceedWithName(); break;
    case 'promptEditName':  promptEditName();  break;
    case 'saveEditName':    saveEditName();    break;
    case 'cancelEditName':  cancelEditName();  break;
    case 'loConfirm': {
      // Bug #10: pre-fill the order screen instead of submitting immediately
      // so the user can review prices and make adjustments before confirming
      const _last = loadLastOrder(S.currentName);
      if (_last) _last.items.forEach(i => { S.currentQty[i.name] = i.qty; });
      closeLoModal();
      renderOrderScreen(S.currentName);
      break;
    }
    case 'loDecline':
    case 'loClose':
      closeLoModal();
      renderOrderScreen(S.currentName);
      break;

    case 'clearOrder':    clearAllItems(); break;
    case 'cancelMyOrder': handleCancelOrder(el); break;

    case 'goBackToName':
      S.currentQty = {};
      S.isDirty    = false;
      S.orderedBy  = null;
      renderNameScreen();
      break;

    // Order screen
    case 'qty': {
      const id    = parseInt(el.dataset.id,    10);
      const delta = parseInt(el.dataset.delta, 10);
      chgQty(id, delta);
      S.isDirty = true;
      break;
    }
    case 'toggleCat': {
      const block = el.closest('.category-block');
      if (block) block.classList.toggle('open');
      break;
    }
    case 'submitOrder':    submitOrder();    break;
    case 'editMyOrder':    editMyOrder();    break;
    case 'orderForAnother': orderForAnother(); break;

    // Closed screen
    case 'lookupClosedOrder': lookupClosedOrder(); break;

    // Manager login
    case 'doManagerLogin': doManagerLogin(); break;
    case 'showMgrLogin':   renderManagerLogin(); break;
    case 'exitManager':    exitManager();    break;

    // Manager dashboard
    case 'refreshManager': refreshManagerDashboard(); break;
    case 'doLock':  doLock();  break;
    case 'doReset': doReset(); break;
    case 'deleteOrder': {
      const name = el.dataset.name;
      if (name) doDeleteOrder(name, el);
      break;
    }
    case 'deleteName': {
      const name = el.dataset.name;
      if (name) doDeleteName(name, el);
      break;
    }
    case 'openModal': {
      const name = el.dataset.name;
      if (name) openModal(name);
      break;
    }
    case 'toggleOC': {
      const body = el.nextElementSibling;
      if (body) {
        body.classList.toggle('open');
        const card = el.closest('.order-card');
        if (card) card.classList.toggle('open');
      }
      break;
    }
    case 'mgrAddPerson': mgrAddPerson(); break;
    case 'copyOrder': {
      const text = buildRestaurantText();
      navigator.clipboard.writeText(text)
        .then(() => showToast('تم النسخ ✓'))
        .catch(() => showToast('فشل النسخ'));
      break;
    }

    // Edit modal
    case 'editQty': {
      const id    = parseInt(el.dataset.id,    10);
      const delta = parseInt(el.dataset.delta, 10);
      chgEditQty(id, delta);
      break;
    }
    case 'closeModal': closeModal(); break;
    case 'saveModal':  saveModal();  break;

    // Error screen
    case 'retryInit': init().catch(() => renderErrorScreen()); break;
  }
});

// Native-event listeners
document.getElementById('nameSelect').addEventListener('change', onNameSelectChange);
document.getElementById('closedNameSelect').addEventListener('change', lookupClosedOrder);
document.getElementById('mgrCodeInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doManagerLogin();
});

/* ---------- NAME SCREEN LOGIC ---------- */
function onNameSelectChange() {
  const val = document.getElementById('nameSelect').value;
  document.getElementById('newNameWrap').style.display   = val === '__new__' ? 'block' : 'none';
  document.getElementById('editNameBtn').style.display   = (val && val !== '__new__') ? 'flex' : 'none';
  document.getElementById('editNameWrap').style.display  = 'none';  // Bug #6: collapse inline edit

  // UX: show a last-order preview card inline so users see it before tapping proceed
  const previewEl = document.getElementById('lastOrderPreview');
  if (previewEl) {
    if (val && val !== '__new__') {
      const last = loadLastOrder(val);
      if (last) {
        const shownItems = last.items.slice(0, 3).map(i => `${h(i.name)} ×${i.qty}`).join(' · ');
        const extra  = last.items.length > 3 ? ` (+${last.items.length - 3} أصناف)` : '';
        const dateStr = last.date ? ` — ${last.date}` : '';
        previewEl.innerHTML =
          `<div class="lo-preview-label">🔁 طلبك السابق${dateStr}</div>` +
          `<div class="lo-preview-items">${shownItems}${extra}</div>`;
        previewEl.style.display = 'block';
      } else {
        previewEl.style.display = 'none';
      }
    } else {
      previewEl.style.display = 'none';
    }
  }

  if (val === '__new__') setTimeout(() => document.getElementById('newNameInput').focus(), 50);
}

async function proceedWithName() {
  const val = document.getElementById('nameSelect').value;
  if (!val) { showToast('اختار اسمك الأول'); return; }

  // Bug #9: show loading state during API calls so user doesn't tap twice
  const btn = document.querySelector('[data-action="proceedWithName"]');
  setBtnLoading(btn, 'جاري التحقق');

  let name;
  try {
    if (val === '__new__') {
      name = document.getElementById('newNameInput').value.trim();
      if (!name) { resetBtn(btn); showToast('اكتب اسمك'); return; }
      if (!S.names.some(n => normAr(n) === normAr(name))) {
        try {
          await api('addName', { name });
          S.names.push(name);
        } catch (e) {}
      }
    } else {
      name = val;
    }

    // When ordering as proxy, refresh orders to get latest state before checking
    if (S.orderedBy) {
      try {
        const fresh = await api('getOrders');
        S.orders = fresh.data || [];
      } catch (e) {}
    }
  } finally {
    resetBtn(btn);
  }

  // Bug #3: do NOT set S.currentName before the proxy confirm dialog.
  // If the user clicks "لا، إلغاء", S.currentName must stay null/previous,
  // not polluted with the name they were about to proxy-order for.
  S.currentQty = {};
  S.isDirty    = false;

  const existing = S.orders.find(o => normAr(o.name) === normAr(name));
  if (existing) {
    if (S.orderedBy) {
      // Proxy: only set S.currentName INSIDE the confirm callback
      showConfirm(`عند ${h(name)} طلب موجود — هتعدل عليه؟`, () => {
        S.currentName = name;
        existing.items.forEach(i => { S.currentQty[i.name] = i.qty; });
        renderOrderScreen(name);
      });
      return;
    } else {
      // Returning user who already submitted — show summary so they can cancel / edit
      S.currentName = name;
      existing.items.forEach(i => { S.currentQty[i.name] = i.qty; });
      renderSubmittedScreen();
      return;
    }
  }

  // Fresh session — set name now (no confirm needed)
  S.currentName = name;

  // Check if there's a previous-day order to pre-fill
  if (!S.orderedBy) {
    const last = loadLastOrder(name);
    if (last) { showLastOrderPrompt(last.items, last.date); return; }  // Bug #11: pass date
  }

  renderOrderScreen(name);
}

// Bug #6: Show inline edit field instead of blocking browser prompt()
function promptEditName() {
  const val = document.getElementById('nameSelect').value;
  if (!val || val === '__new__') return;
  const inp  = document.getElementById('editNameInput');
  const wrap = document.getElementById('editNameWrap');
  inp.value  = val;
  wrap.style.display = 'block';
  document.getElementById('newNameWrap').style.display = 'none';
  setTimeout(() => inp.focus(), 50);
}

function saveEditName() {
  const oldName = document.getElementById('nameSelect').value;
  const newName = document.getElementById('editNameInput').value.trim();
  document.getElementById('editNameWrap').style.display = 'none';
  if (!newName || newName === oldName) return;
  doUpdateName(oldName, newName);
}

function cancelEditName() {
  document.getElementById('editNameWrap').style.display = 'none';
  document.getElementById('editNameInput').value = '';
}

async function doUpdateName(oldName, newName) {
  try {
    await api('updateName', { oldName, newName });
    const idx = S.names.indexOf(oldName);
    if (idx !== -1) S.names[idx] = newName;
    S.orders.forEach(o => {
      if (o.name === oldName)      o.name      = newName;
      if (o.orderedBy === oldName) o.orderedBy = newName;
    });
    fillNameDropdown('nameSelect');
    document.getElementById('nameSelect').value = newName;
    onNameSelectChange();
    showToast('تم تعديل الاسم ✓');
  } catch (e) {
    showToast('فشل تعديل الاسم ❌');
  }
}

/* ---------- ORDER SCREEN LOGIC ---------- */
// Uses showConfirm instead of browser confirm() because it hits the DB.
function handleCancelOrder(btn) {
  if (!S.currentName) return;
  showConfirm('متأكد مش هتطلب النهارده؟ الطلب هيتمسح نهائياً', async () => {
    setBtnLoading(btn, 'جاري الإلغاء');
    try {
      await cancelOrder(S.currentName);
      S.orders      = S.orders.filter(o => normAr(o.name) !== normAr(S.currentName));
      S.currentQty  = {};
      S.isDirty     = false;
      resetBtn(btn);       // Bug #3: must reset here too — DOM element persists in memory
      S.currentName = null;
      showToast('تم إلغاء طلبك ✓');
      setTimeout(renderNameScreen, 800);
    } catch (err) {
      resetBtn(btn);
      showToast(err.message || 'مشكلة في الإلغاء');
    }
  });
}

function clearAllItems() {
  if (!Object.keys(S.currentQty).length) return;
  S.currentQty = {};
  S.isDirty = false;
  document.querySelectorAll('.qty-num').forEach(el => {
    el.textContent = '0';
    el.classList.remove('nonzero');
  });
  Object.keys(S.menu).forEach(cat => updateCatBadge(cat));
  updateTotal();
}

function chgQty(id, delta) {
  const item = S.menuFlat[id];
  const cur  = S.currentQty[item.name] || 0;
  const next = Math.max(0, cur + delta);
  if (next === 0) delete S.currentQty[item.name];
  else S.currentQty[item.name] = next;

  const numEl = document.getElementById(`qn-${id}`);
  numEl.textContent = next;
  numEl.classList.toggle('nonzero', next > 0);

  updateCatBadge(item.category);
  updateTotal();
}

async function submitOrder() {
  const items = Object.entries(S.currentQty)
    .filter(([, q]) => q > 0)
    .map(([name, qty]) => ({ name, qty, price: findPrice(name) }));

  if (!items.length) { showToast('ما اخترتش حاجة'); return; }

  const btn = document.getElementById('submitBtn');
  setBtnLoading(btn, 'جاري الإرسال');

  try {
    await api('submitOrder', {
      data: { name: S.currentName, items, orderedBy: S.orderedBy || S.currentName }
    });

    const idx = S.orders.findIndex(o => o.name === S.currentName);
    if (idx !== -1) S.orders[idx].items = items;
    else S.orders.push({ name: S.currentName, items, orderedBy: S.orderedBy || S.currentName });

    saveLastOrder(S.currentName, items);   // saves items + timestamp
    S.orderedBy = null;
    S.isDirty   = false;
    resetBtn(btn);
    renderSubmittedScreen();
    showToast('تم حفظ الطلب ✓');
  } catch (e) {
    if (e.message === 'الطلبات مقفولة') {
      S.isLocked = true;
      stopUserPoll();
      showToast('🔒 الطلبات اتقفلت!');
      renderClosedScreen(S.currentName);
    } else {
      showToast('خطأ في الإرسال — حاول تاني ❌');
      resetBtn(btn);
    }
  }
}

/* ---------- SUBMITTED SCREEN LOGIC ---------- */
function editMyOrder() {
  if (S.isLocked) {
    showToast('🔒 الطلبات اتقفلت، مش ممكن تعدل');
    renderClosedScreen(S.currentName);
    return;
  }
  // FIX: don't set isDirty here — only set it when a quantity actually changes
  renderOrderScreen(S.currentName);
}

function orderForAnother() {
  if (S.isDirty) {
    if (!confirm('عندك طلب مش متأكد منه — هتسيبه وتمشي؟')) return;
  }
  S.orderedBy   = S.currentName;
  S.currentName = null;
  S.currentQty  = {};
  S.isDirty     = false;
  renderNameScreen();
}

/* ---------- CLOSED SCREEN LOGIC ---------- */
function lookupClosedOrder() {
  const name = document.getElementById('closedNameSelect').value;
  if (!name || name === '__new__') return;
  const order = S.orders.find(o => normAr(o.name) === normAr(name));
  if (!order) { showToast('مش لاقيك في الطلبات'); return; }
  renderClosedOrder(name, order.items);
}

/* ---------- DIRTY ORDER WARNING ---------- */
window.addEventListener('beforeunload', e => {
  if (S.isDirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

window.addEventListener('load', () => {
  // Modal backdrop dismissals
  document.getElementById('loModal').addEventListener('click', function(e) {
    if (e.target === this) { closeLoModal(); renderOrderScreen(S.currentName); }
  });
  document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('confirmModal').addEventListener('click', function(e) {
    if (e.target === this) cancelConfirm();
  });

  init().catch(() => renderErrorScreen());
});
