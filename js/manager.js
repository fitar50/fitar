
// ================================================================
// MANAGER DASHBOARD
// ================================================================

async function refreshManagerDashboard() {
  try {
    const [ordersR, namesR, statusR] = await Promise.all([
      api('getOrders'), api('getNames'), api('getStatus')
    ]);
    S.orders   = ordersR.data  || [];
    S.names    = namesR.data   || [];
    S.isLocked = statusR.locked;
    S.lockTime = statusR.lockTime;
    renderManagerDashboard();
    document.getElementById('lastUpdated').textContent =
      'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    showToast('فشل التحديث');
  }
}

function renderManagerDashboard() {
  const orders  = S.orders;
  const people  = orders.length;
  const delPP   = people > 0 ? DELIVERY_FEE / people : 0;
  let foodGrand = 0;
  orders.forEach(o => { foodGrand += o.items.reduce((s, i) => s + i.price * i.qty, 0); });
  const totalGrand = foodGrand + (people > 0 ? DELIVERY_FEE : 0);

  // Stats
  document.getElementById('sPeople').textContent = people;
  document.getElementById('sFood').textContent   = foodGrand;
  document.getElementById('sTotal').textContent  = totalGrand.toFixed(0);

  // Aggregate items
  const agg = {};
  orders.forEach(o => o.items.forEach(i => {
    if (!agg[i.name]) agg[i.name] = { qty: 0, price: i.price };
    agg[i.name].qty += i.qty;
  }));
  const sortedAgg = Object.entries(agg).sort((a, b) => b[1].qty - a[1].qty);

  // Total summary card
  const ts = document.getElementById('totalSummary');
  if (!sortedAgg.length) {
    ts.innerHTML = '<div class="ts-row" style="color:var(--grey);">لا يوجد طلبات حتى الآن</div>';
  } else {
    let food = 0;
    const rows = sortedAgg.map(([name, info]) => {
      const sub = info.price * info.qty;
      food += sub;
      return `<div class="ts-row"><span>${h(name)} × ${info.qty}</span><span>${sub} جنيه</span></div>`;
    }).join('');
    ts.innerHTML = `
      <div class="ts-header">📦 الطلبات</div>
      ${rows}
      <div class="ts-row" style="color:var(--grey);font-size:13px;">
        <span>توصيل</span><span>${DELIVERY_FEE} جنيه</span>
      </div>
      <div class="ts-grand">
        <span>الإجمالي</span>
        <span>${(food + DELIVERY_FEE).toFixed(0)} جنيه</span>
      </div>
      <button class="copy-btn" id="copyOrderBtn" data-action="copyOrder">📋 نسخ الطلب للمطعم</button>`;
  }

  // Per-person cards
  const list = document.getElementById('ordersList');
  if (!orders.length) {
    list.innerHTML = '<div class="empty"><div class="e-icon">🍽️</div><p>لا يوجد طلبات بعد</p></div>';
  } else {
    list.innerHTML = '';
    orders.forEach(order => {
      const food  = order.items.reduce((s, i) => s + i.price * i.qty, 0);
      const total = food + delPP;
      const orderedByTag = (order.orderedBy && order.orderedBy !== order.name)
        ? `<div class="oc-ordered-by">بواسطة: ${h(order.orderedBy)}</div>` : '';
      const card = document.createElement('div');
      card.className = 'order-card';
      card.innerHTML = `
        <div class="oc-header" data-action="toggleOC">
          <div class="oc-header-info">
            <div class="oc-name">${h(order.name)}</div>
            ${orderedByTag}
          </div>
          <div class="oc-header-controls">
            <span class="oc-total">${total.toFixed(2)} ج</span>
            <button class="oc-icon-btn" data-action="openModal"   data-name="${h(order.name)}" title="تعديل الطلب">✏️</button>
            <button class="oc-icon-btn oc-del" data-action="deleteOrder" data-name="${h(order.name)}" title="حذف الطلب">🗑️</button>
            <span class="cat-chevron">▼</span>
          </div>
        </div>
        <div class="oc-body">
          ${order.items.map(i => `
            <div class="oc-item">
              <span>${h(i.name)} × ${i.qty}</span>
              <span>${i.price * i.qty} جنيه</span>
            </div>`).join('')}
          <div class="oc-breakdown">
            <div class="oc-brow"><span>طعام</span><span>${food} جنيه</span></div>
            <div class="oc-brow"><span>توصيل (${people} أشخاص)</span><span>${delPP.toFixed(2)} جنيه</span></div>
            <div class="oc-brow grand"><span>الإجمالي</span><span>${total.toFixed(2)} جنيه</span></div>
          </div>
        </div>`;
      list.appendChild(card);
    });
  }

  // Add-person dropdown
  fillNameDropdown('mgrPersonSel');

  // Names management section
  renderNamesManagement();

  // Lock / reset actions
  const mgrActions = document.getElementById('mgrActions');
  if (S.isLocked) {
    mgrActions.innerHTML = `
      <div class="locked-badge">✅ الطلبات مقفولة — تم الإرسال ${S.lockTime}</div>
      <button class="btn btn-red" data-action="doReset">🔄 تصفير الطلبات</button>`;
  } else {
    mgrActions.innerHTML = `
      <button class="btn btn-green" id="lockBtn" data-action="doLock">🔒 قفل الطلبات وإرسال للمطعم</button>
      <button class="btn btn-red" data-action="doReset">🔄 تصفير الطلبات</button>`;
  }
}

/* ---------- NAMES MANAGEMENT ---------- */
// Renders the list of all registered names with a delete button each.
// Names that have an order today are marked with a ✓ badge.
function renderNamesManagement() {
  const container = document.getElementById('namesMgmtList');
  if (!container) return;

  if (!S.names.length) {
    container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--grey);font-size:13px;">لا يوجد أسماء مسجلة</div>';
    return;
  }

  container.innerHTML = '';
  S.names.forEach(name => {
    const hasOrder = S.orders.some(o => normAr(o.name) === normAr(name));
    const row = document.createElement('div');
    row.className = 'name-mgmt-row';
    row.innerHTML = `
      <span class="name-mgmt-label">
        ${h(name)}
        ${hasOrder ? '<span class="name-has-order">✓ طلب</span>' : ''}
      </span>
      <button class="oc-icon-btn oc-del" data-action="deleteName" data-name="${h(name)}" title="مسح الاسم">🗑️</button>`;
    container.appendChild(row);
  });
}

// Deletes a name from the permanent list (calls deleteName action on the Apps Script).
// NOTE: your Apps Script must handle the 'deleteName' action for this to work.
async function doDeleteName(name, btn) {
  // Bug #5: warn manager if the person already has an order today (ghost-order risk)
  const hasOrder = S.orders.some(o => normAr(o.name) === normAr(name));
  const msg = hasOrder
    ? `هتمسح "${name}" من الأسماء — طلبهم هيفضل موجود في القايمة ومش هيتمسح. تأكيد؟`
    : `هتمسح "${name}" من قايمة الأسماء نهائياً؟`;
  showConfirm(msg, async () => {
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    try {
      await api('deleteName', { name, ref: S.mgrKey });
      S.names = S.names.filter(n => n !== name);
      showToast('تم مسح الاسم ✓');
      renderManagerDashboard();
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      showToast(e.message || 'فشل مسح الاسم ❌');
    }
  });
}

function buildRestaurantText() {
  const agg = {};
  S.orders.forEach(o => o.items.forEach(i => {
    if (!agg[i.name]) agg[i.name] = 0;
    agg[i.name] += i.qty;
  }));
  const lines      = Object.entries(agg).map(([name, qty]) => `${name} × ${qty}`);
  const totalItems = Object.values(agg).reduce((a, b) => a + b, 0);
  return `طلب فطار الشغل:\n${lines.join('\n')}\n\nالإجمالي: ${totalItems} صنف + توصيل ${DELIVERY_FEE} ج`;
}

/* ---------- EDIT MODAL ---------- */
function openModal(name) {
  S.editName = name;
  const order = S.orders.find(o => o.name === name);
  S.editQty = {};
  if (order) order.items.forEach(i => { S.editQty[i.name] = i.qty; });

  document.getElementById('modalTitle').textContent = `تعديل طلب ${h(name)}`;
  renderModal();
  document.getElementById('editModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
  document.body.style.overflow = '';
  S.editName = null;
  S.editQty  = {};
}

function renderModal() {
  const body = document.getElementById('modalBody');
  body.innerHTML = '';

  Object.entries(S.menu).forEach(([cat, items]) => {
    const selCount = items.filter(i => (S.editQty[i.name] || 0) > 0).length;
    const block = document.createElement('div');
    block.className = 'category-block' + (selCount > 0 ? ' open' : '');

    let itemsHtml = '';
    items.forEach(item => {
      const fi  = S.menuFlat.find(f => f.name === item.name);
      const id  = fi ? fi.id : 0;
      const qty = S.editQty[item.name] || 0;
      itemsHtml += `
        <div class="item-row">
          <div class="item-info">
            <div class="item-name">${h(item.name)}</div>
            <div class="item-price">${item.price} جنيه</div>
          </div>
          <div class="qty">
            <button class="qty-btn minus" data-action="editQty" data-id="${id}" data-delta="-1">−</button>
            <div class="qty-num ${qty > 0 ? 'nonzero' : ''}" id="mqn-${id}">${qty}</div>
            <button class="qty-btn plus"  data-action="editQty" data-id="${id}" data-delta="+1">+</button>
          </div>
        </div>`;
    });

    block.innerHTML = `
      <div class="cat-header" data-action="toggleCat">
        <span class="cat-title">${h(cat)}</span>
        <div class="cat-right">
          <span class="cat-badge ${selCount ? 'show' : ''}" id="mbadge-${h(cat)}">${selCount}</span>
          <span class="cat-chevron">▼</span>
        </div>
      </div>
      <div class="cat-items">${itemsHtml}</div>`;
    body.appendChild(block);
  });
}

function chgEditQty(id, delta) {
  const item = S.menuFlat[id];
  const cur  = S.editQty[item.name] || 0;
  const next = Math.max(0, cur + delta);
  if (next === 0) delete S.editQty[item.name];
  else S.editQty[item.name] = next;

  const el = document.getElementById(`mqn-${id}`);
  el.textContent = next;
  el.classList.toggle('nonzero', next > 0);

  const items = S.menu[item.category] || [];
  const count = items.filter(i => (S.editQty[i.name] || 0) > 0).length;
  const badge = document.getElementById(`mbadge-${item.category}`);
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('show', count > 0);
  }
}

// Saving with 0 items uses showConfirm (it deletes from the DB — DB hit).
async function saveModal() {
  const items = Object.entries(S.editQty)
    .filter(([, q]) => q > 0)
    .map(([name, qty]) => ({ name, qty, price: findPrice(name) }));

  if (!items.length) {
    showConfirm(`هتمسح طلب ${S.editName} بالكامل؟`, () => {
      _doSaveModal(items);
    });
    return;
  }
  await _doSaveModal(items);
}

async function _doSaveModal(items) {
  const saveBtn = document.getElementById('modalSaveBtn');
  setBtnLoading(saveBtn, 'جاري الحفظ');
  try {
    await api('mgr_update', { data: { name: S.editName, items }, ref: S.mgrKey });

    const idx = S.orders.findIndex(o => o.name === S.editName);
    if (items.length === 0) {
      if (idx !== -1) S.orders.splice(idx, 1);
    } else if (idx !== -1) {
      S.orders[idx].items = items;
    } else {
      S.orders.push({ name: S.editName, items });
    }

    closeModal();
    renderManagerDashboard();
    showToast('تم الحفظ ✓');
  } catch (e) {
    showToast(e.message || 'فشل الحفظ ❌');
  } finally {
    if (saveBtn) resetBtn(saveBtn);
  }
}

/* ---------- MANAGER ACTIONS ---------- */
async function doManagerLogin() {
  const code = document.getElementById('mgrCodeInput').value.trim();
  if (!code) { showToast('ادخل الكود'); return; }

  const btn = document.querySelector('#screen-mgr-login .btn');
  setBtnLoading(btn, 'جاري التحقق');

  try {
    const res = await api('verify', { ref: code });
    if (!res.success) {
      showToast('بس يا بابا. بلاش لعب');
      resetBtn(btn);
      return;
    }
    S.mgrKey = code;
    stopUserPoll();   // stop user poll before entering manager mode
    await refreshManagerDashboard();
    showScreen('screen-manager');
    S.mgrRefreshTimer = setInterval(refreshManagerDashboard, 10000);  // 10 s refresh
  } catch (e) {
    showToast('خطأ في الاتصال ❌');
    resetBtn(btn);
  }
}

function exitManager() {
  if (S.mgrRefreshTimer) {
    clearInterval(S.mgrRefreshTimer);
    S.mgrRefreshTimer = null;
  }
  S.mgrKey = null;
  api('getStatus').then(r => {
    S.isLocked = r.locked;
    S.lockTime = r.lockTime;
    if (S.isLocked) {
      renderClosedScreen(null);
    } else {
      startUserPoll();   // restart user poll when going back to user screens
      renderNameScreen();
    }
  }).catch(() => {
    startUserPoll();
    renderNameScreen();
  });
}

// Uses showConfirm — hits the DB (locks the sheet).
function doLock() {
  showConfirm('هتقفل الطلبات؟ مش هيقدر حد يعدل أو يضيف بعد كده.', async () => {
    const btn = document.getElementById('lockBtn');
    if (btn) setBtnLoading(btn, 'جاري القفل');
    try {
      await api('lock', { ref: S.mgrKey });
      S.isLocked = true;
      showToast('تم قفل الطلبات ✓');
      await refreshManagerDashboard();
    } catch (e) {
      showToast(e.message || 'فشل القفل ❌');
      if (btn) resetBtn(btn);
    }
  });
}

// Uses showConfirm — hits the DB (wipes all orders).
function doReset() {
  showConfirm('هتمسح كل الطلبات النهارده؟ العملية مش هترجع!', async () => {
    try {
      await api('reset', { ref: S.mgrKey });
      S.orders   = [];
      S.isLocked = false;
      showToast('تم التصفير ✓');
      renderManagerDashboard();
    } catch (e) {
      showToast(e.message || 'فشل التصفير ❌');
    }
  });
}

// Uses showConfirm — hits the DB (deletes one person's order).
function doDeleteOrder(name, btn) {
  showConfirm(`هتحذف طلب "${name}"؟`, async () => {
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    try {
      await api('mgr_delete', { name, ref: S.mgrKey });
      S.orders = S.orders.filter(o => o.name !== name);
      showToast('تم الحذف ✓');
      renderManagerDashboard();
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      showToast(e.message || 'فشل الحذف ❌');
    }
  });
}

async function mgrAddPerson() {
  const sel    = document.getElementById('mgrPersonSel');
  const newInp = document.getElementById('mgrPersonNew');
  const name   = (sel.value && sel.value !== '__new__') ? sel.value : newInp.value.trim();
  if (!name) { showToast('اختار أو اكتب اسم'); return; }

  if (!S.names.includes(name)) {
    try { await api('addName', { name }); S.names.push(name); } catch (e) {}
  }

  newInp.value = '';
  sel.value    = '';
  openModal(name);
}
