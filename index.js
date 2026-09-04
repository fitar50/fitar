// index.js
const express = require('express');
const cors    = require('cors');
const db      = require('./db');
const { normAr, checkMgr, cleanItems } = require('./middleware');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// ── Auto-migrate: create tables if they don't exist ──────────────
async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS names (
      name TEXT PRIMARY KEY
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS menu (
      id         SERIAL PRIMARY KEY,
      category   TEXT    NOT NULL,
      name       TEXT    NOT NULL,
      price      INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      name        TEXT        PRIMARY KEY,
      items       JSONB       NOT NULL DEFAULT '[]',
      ordered_by  TEXT        NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    INSERT INTO config (key, value) VALUES
      ('locked',       'false'),
      ('lockTime',     ''),
      ('orderingOpen', 'false')
    ON CONFLICT (key) DO NOTHING
  `);
  console.log('✓ DB migration complete');
}

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Main API endpoint
app.post('/api', async (req, res) => {
  const { action, ...params } = req.body || {};
  try {
    switch (action) {

      case 'getAll': {
        const [cfgRes, menuRes, namesRes, ordersRes, countRes] = await Promise.all([
          db.query("SELECT key, value FROM config"),
          db.query("SELECT category, name, price FROM menu ORDER BY sort_order, id"),
          db.query("SELECT name FROM names ORDER BY name"),
          db.query("SELECT name, items, ordered_by FROM orders ORDER BY created_at"),
          db.query("SELECT COUNT(*) FROM orders")
        ]);

        const cfg = {};
        cfgRes.rows.forEach(r => { cfg[r.key] = r.value; });

        const menu = {};
        menuRes.rows.forEach(r => {
          if (!menu[r.category]) menu[r.category] = [];
          menu[r.category].push({ name: r.name, price: r.price });
        });

        const names  = namesRes.rows.map(r => r.name);
        const orders = ordersRes.rows.map(r => ({
          name: r.name,
          items: r.items,
          orderedBy: r.ordered_by
        }));

        return res.json({
          success:      true,
          menu,
          names,
          orders,
          locked:       cfg.locked       === 'true',
          lockTime:     cfg.lockTime     || '',
          orderingOpen: cfg.orderingOpen === 'true',
          ordersCount:  parseInt(countRes.rows[0].count, 10)
        });
      }

      case 'getMenu': {
        const { rows } = await db.query("SELECT category, name, price FROM menu ORDER BY sort_order, id");
        const data = {};
        rows.forEach(r => {
          if (!data[r.category]) data[r.category] = [];
          data[r.category].push({ name: r.name, price: r.price });
        });
        return res.json({ success: true, data });
      }

      case 'getNames': {
        const { rows } = await db.query("SELECT name FROM names ORDER BY name");
        return res.json({ success: true, data: rows.map(r => r.name) });
      }

      case 'getStatus': {
        const [cfgRes, countRes] = await Promise.all([
          db.query("SELECT key, value FROM config WHERE key IN ('locked','lockTime','orderingOpen')"),
          db.query("SELECT COUNT(*) FROM orders")
        ]);
        const cfg = {};
        cfgRes.rows.forEach(r => { cfg[r.key] = r.value; });
        return res.json({
          success:      true,
          locked:       cfg.locked       === 'true',
          lockTime:     cfg.lockTime     || '',
          orderingOpen: cfg.orderingOpen === 'true',
          ordersCount:  parseInt(countRes.rows[0].count, 10)
        });
      }

      case 'getOrders': {
        const { rows } = await db.query("SELECT name, items, ordered_by FROM orders ORDER BY created_at");
        return res.json({
          success: true,
          data: rows.map(r => ({ name: r.name, items: r.items, orderedBy: r.ordered_by }))
        });
      }

      case 'getOrderingStatus': {
        const { rows } = await db.query("SELECT value FROM config WHERE key = 'orderingOpen'");
        return res.json({ success: true, orderingEnabled: rows[0]?.value === 'true' });
      }

      case 'verify': {
        const stored = process.env.MGR_CODE || '';
        return res.json({ success: !!(stored && String(params.ref || '') === stored) });
      }

      case 'submitOrder': {
        const { rows: cfgRows } = await db.query(
          "SELECT key, value FROM config WHERE key IN ('locked','orderingOpen')"
        );
        const cfg = {};
        cfgRows.forEach(r => { cfg[r.key] = r.value; });
        if (cfg.locked === 'true')       throw new Error('الطلبات مقفولة');
        if (cfg.orderingOpen !== 'true') throw new Error('الطلبات مش مفتوحة');

        const data = params.data || {};
        const name = normAr(data.name || '');
        if (!name) throw new Error('الاسم مفيش');

        const items = await cleanItems(db, data.items);
        if (!items.length) throw new Error('الطلب فاضي');

        const orderedBy = data.orderedBy || data.name;
        await db.query(
          `INSERT INTO orders (name, items, ordered_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO UPDATE
             SET items      = EXCLUDED.items,
                 ordered_by = EXCLUDED.ordered_by,
                 created_at = NOW()`,
          [data.name, JSON.stringify(items), orderedBy]
        );
        return res.json({ success: true });
      }

      case 'cancelOrder': {
        const name = normAr(params.name || '');
        await db.query('DELETE FROM orders WHERE name = $1', [name]);
        return res.json({ success: true });
      }

      case 'addName': {
        checkMgr(params.ref);
        const name = String(params.name || '').trim();
        if (!name) throw new Error('الاسم مفيش');
        await db.query('INSERT INTO names (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
        return res.json({ success: true });
      }

      case 'deleteName': {
        checkMgr(params.ref);
        const name = normAr(params.name || '');
        await db.query('DELETE FROM names WHERE name = $1', [name]);
        return res.json({ success: true });
      }

      case 'updateName': {
        const oldName = normAr(params.oldName || '');
        const newName = String(params.newName || '').trim();
        if (!oldName || !newName) throw new Error('الاسم مفيش');
        await db.query('UPDATE names SET name = $1 WHERE name = $2', [newName, oldName]);
        await db.query(
          `UPDATE orders SET
             name       = CASE WHEN name       = $2 THEN $1 ELSE name       END,
             ordered_by = CASE WHEN ordered_by = $2 THEN $1 ELSE ordered_by END
           WHERE name = $2 OR ordered_by = $2`,
          [newName, oldName]
        );
        return res.json({ success: true });
      }

      case 'lock': {
        checkMgr(params.ref);
        const lockTime = new Date().toLocaleString('ar-EG', {
          hour: '2-digit', minute: '2-digit', hour12: true
        });
        await db.query("UPDATE config SET value = 'true' WHERE key = 'locked'");
        await db.query("UPDATE config SET value = $1    WHERE key = 'lockTime'", [lockTime]);
        return res.json({ success: true });
      }

      case 'reset': {
        checkMgr(params.ref);
        await db.query('DELETE FROM orders');
        await db.query("UPDATE config SET value = 'false' WHERE key = 'locked'");
        await db.query("UPDATE config SET value = ''      WHERE key = 'lockTime'");
        await db.query("UPDATE config SET value = 'false' WHERE key = 'orderingOpen'");
        return res.json({ success: true });
      }

      case 'mgr_update': {
        checkMgr(params.ref);
        const data  = params.data || {};
        const name  = normAr(data.name || '');
        const items = await cleanItems(db, data.items);

        if (items.length === 0) {
          await db.query('DELETE FROM orders WHERE name = $1', [name]);
        } else {
          await db.query(
            `INSERT INTO orders (name, items, ordered_by)
             VALUES ($1, $2, $1)
             ON CONFLICT (name) DO UPDATE
               SET items = EXCLUDED.items, created_at = NOW()`,
            [data.name, JSON.stringify(items)]
          );
        }
        return res.json({ success: true });
      }

      case 'mgr_delete': {
        checkMgr(params.ref);
        const name = normAr(params.name || '');
        await db.query('DELETE FROM orders WHERE name = $1', [name]);
        return res.json({ success: true });
      }

      case 'setOrderingStatus': {
        checkMgr(params.ref);
        const val = params.enabled === true || params.enabled === 'true' ? 'true' : 'false';
        await db.query("UPDATE config SET value = $1 WHERE key = 'orderingOpen'", [val]);
        return res.json({ success: true });
      }

      default:
        return res.json({ success: false, error: 'إجراء غير معروف: ' + action });
    }
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
});

// Start server only after migration succeeds
migrate()
  .then(() => app.listen(PORT, () => console.log(`fitar backend running on port ${PORT}`)))
  .catch(err => { console.error('Migration failed:', err.message); process.exit(1); });

