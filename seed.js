// seed.js
// Fill in MENU and NAMES below with your actual data, then run:
//   DATABASE_URL="your-railway-postgres-url" node seed.js
// Or set DATABASE_URL in your shell first.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ── EDIT THESE ─────────────────────────────────────────────────

// Menu: { category, name, price, sort_order }
// sort_order controls display order within a category (lower = shown first).
// Items with the same sort_order fall back to insertion order.
const MENU = [
  { category: 'ساندوتشات', name: 'ساندوتش فول',    price: 15, sort_order: 1 },
  { category: 'ساندوتشات', name: 'ساندوتش طعمية', price: 12, sort_order: 2 },
  { category: 'ساندوتشات', name: 'ساندوتش بطاطس', price: 10, sort_order: 3 },
  { category: 'مشروبات',   name: 'شاي',            price: 5,  sort_order: 1 },
  { category: 'مشروبات',   name: 'قهوة',           price: 8,  sort_order: 2 },
  // Add more items here...
];

// Employee names
const NAMES = [
  'أحمد',
  'محمد',
  'سارة',
  // Add all employee names here...
];

// ── DO NOT EDIT BELOW THIS LINE ─────────────────────────────────

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Menu: clear and repopulate so sort_order changes take effect
    await client.query('DELETE FROM menu');
    for (const item of MENU) {
      await client.query(
        'INSERT INTO menu (category, name, price, sort_order) VALUES ($1, $2, $3, $4)',
        [item.category, item.name, item.price, item.sort_order]
      );
    }
    console.log(`✓ Inserted ${MENU.length} menu items`);

    // Names: insert only new ones, skip existing
    let namesAdded = 0;
    for (const name of NAMES) {
      const res = await client.query(
        'INSERT INTO names (name) VALUES ($1) ON CONFLICT DO NOTHING',
        [name.trim()]
      );
      if (res.rowCount > 0) namesAdded++;
    }
    console.log(`✓ Inserted ${namesAdded} new names (${NAMES.length - namesAdded} already existed)`);

    await client.query('COMMIT');
    console.log('✓ Seed complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
