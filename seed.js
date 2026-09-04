// seed.js
// Fill in NAMES below with your actual employee names, then run:
//   DATABASE_URL="your-railway-postgres-url" node seed.js

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ── EDIT NAMES ONLY ────────────────────────────────────────────

// Employee names — fill these in
const NAMES = [
    // 'أحمد',
    // 'محمد',
    // Add all employee names here...
];

// ── MENU (complete — do not edit unless prices change) ──────────

const MENU = [
    // فول
    { category: "فول", name: "فول", price: 15, sort_order: 1 },
    { category: "فول", name: "فول دوبل", price: 22, sort_order: 2 },
    { category: "فول", name: "فول علي بيض مسلوق", price: 28, sort_order: 3 },
    { category: "فول", name: "فول علي بيض اومليت", price: 30, sort_order: 4 },
    { category: "فول", name: "فول علي طعمية", price: 22, sort_order: 5 },
    { category: "فول", name: "فول علي بطاطس صوابع", price: 27, sort_order: 6 },
    { category: "فول", name: "فول علي بابا غانوج", price: 26, sort_order: 7 },
    { category: "فول", name: "فول علي باذنجان", price: 26, sort_order: 8 },
    { category: "فول", name: "فول اسكندراني", price: 22, sort_order: 9 },
    { category: "فول", name: "فول سلطة", price: 22, sort_order: 10 },
    { category: "فول", name: "فول زيت حار", price: 21, sort_order: 11 },
    { category: "فول", name: "فول زيت حار بالبيض", price: 30, sort_order: 12 },
    {
        category: "فول",
        name: "فول اسكندراني بالبيض",
        price: 30,
        sort_order: 13
    },
    { category: "فول", name: "فول زيت زيتون", price: 27, sort_order: 14 },
    { category: "فول", name: "فول بالسجق", price: 29, sort_order: 15 },
    { category: "فول", name: "فول بالصلصة", price: 27, sort_order: 16 },
    { category: "فول", name: "فول بالزبدة", price: 27, sort_order: 17 },

    // طعمية
    { category: "طعمية", name: "طعمية", price: 15, sort_order: 1 },
    { category: "طعمية", name: "طعمية محشية", price: 22, sort_order: 2 },
    { category: "طعمية", name: "طعمية دوبل", price: 21, sort_order: 3 },
    { category: "طعمية", name: "طعمية علي باذنجان", price: 26, sort_order: 4 },
    {
        category: "طعمية",
        name: "طعمية علي بيض مسلوق",
        price: 30,
        sort_order: 5
    },
    {
        category: "طعمية",
        name: "طعمية علي بيض اومليت",
        price: 31,
        sort_order: 6
    },
    {
        category: "طعمية",
        name: "طعمية علي جبنة قريش",
        price: 27,
        sort_order: 7
    },
    {
        category: "طعمية",
        name: "طعمية علي بابا غانوج",
        price: 26,
        sort_order: 8
    },
    {
        category: "طعمية",
        name: "طعمية محشية علي باذنجان",
        price: 29,
        sort_order: 9
    },
    {
        category: "طعمية",
        name: "طعمية بشرائح الطماطم",
        price: 25,
        sort_order: 10
    },
    { category: "طعمية", name: "طعمية بالطحينة", price: 25, sort_order: 11 },
    {
        category: "طعمية",
        name: "طعمية بشرائح الطماطم والطحينة",
        price: 26,
        sort_order: 12
    },
    { category: "طعمية", name: "طعمية بالبسطرمة", price: 28, sort_order: 13 },
    { category: "طعمية", name: "طعمية علي مسقعة", price: 26, sort_order: 15 },
    {
        category: "طعمية",
        name: "طعمية بالجبنة الكيري",
        price: 33,
        sort_order: 16
    },

    // بطاطس
    { category: "بطاطس", name: "بطاطس صوابع", price: 25, sort_order: 1 },
    {
        category: "بطاطس",
        name: "بطاطس صوابع علي بابا غانوج",
        price: 30,
        sort_order: 2
    },
    {
        category: "بطاطس",
        name: "بطاطس صوابع علي بيض مسلوق",
        price: 31,
        sort_order: 3
    },
    {
        category: "بطاطس",
        name: "بطاطس صوابع علي بيض اومليت",
        price: 35,
        sort_order: 4
    },
    {
        category: "بطاطس",
        name: "بطاطس صوابع علي طعمية",
        price: 28,
        sort_order: 5
    },
    {
        category: "بطاطس",
        name: "بطاطس صوابع علي طعمية محشية",
        price: 30,
        sort_order: 6
    },
    {
        category: "بطاطس",
        name: "بطاطس صوابع علي باذنجان",
        price: 28,
        sort_order: 7
    },
    {
        category: "بطاطس",
        name: "بطاطس صوابع علي مسقعة",
        price: 28,
        sort_order: 8
    },
    {
        category: "بطاطس",
        name: "بطاطس صوابع علي جبنة قريش",
        price: 28,
        sort_order: 9
    },
    { category: "بطاطس", name: "بطاطس صوابع كاتشب", price: 28, sort_order: 10 },
    {
        category: "بطاطس",
        name: "بطاطس صوابع مايونيز",
        price: 29,
        sort_order: 11
    },
    {
        category: "بطاطس",
        name: "بطاطس صوابع كاتشب ومايونيز",
        price: 30,
        sort_order: 12
    },
    {
        category: "بطاطس",
        name: "بطاطس صوابع علي عجه",
        price: 30,
        sort_order: 13
    },
    {
        category: "بطاطس",
        name: "بطاطس صوابع علي بيض اومليت بسطرمة",
        price: 35,
        sort_order: 14
    },
    { category: "بطاطس", name: "بطاطس بورية", price: 25, sort_order: 15 },
    {
        category: "بطاطس",
        name: "بطاطس بورية علي بيض مسلوق",
        price: 31,
        sort_order: 16
    },
    {
        category: "بطاطس",
        name: "بطاطس بورية علي بيض اومليت",
        price: 35,
        sort_order: 17
    },
    {
        category: "بطاطس",
        name: "بطاطس بورية علي بابا غانوج",
        price: 30,
        sort_order: 18
    },
    {
        category: "بطاطس",
        name: "بطاطس بورية علي جبنة قريش",
        price: 30,
        sort_order: 19
    },
    {
        category: "بطاطس",
        name: "بطاطس بورية مقلية بطبقة بقسماط",
        price: 25,
        sort_order: 20
    },
    { category: "بطاطس", name: "بطاطس شيبسي", price: 25, sort_order: 21 },
    { category: "بطاطس", name: "بطاطس بانية", price: 25, sort_order: 22 },
    { category: "بطاطس", name: "بطاطس جمبري", price: 30, sort_order: 23 },
    {
        category: "بطاطس",
        name: "بطاطس صوابع بالجبنة المقلية",
        price: 43,
        sort_order: 24
    },
    {
        category: "بطاطس",
        name: "بطاطس بالجبنة الرومي",
        price: 39,
        sort_order: 25
    }, // ✦ fixed name (was: بالجن)

    // أخرى
    { category: "أخرى", name: "بيض مسلوق", price: 26, sort_order: 1 },
    { category: "أخرى", name: "بيض مسلوق دوبل", price: 31, sort_order: 2 },
    { category: "أخرى", name: "بيض اومليت", price: 28, sort_order: 3 },
    { category: "أخرى", name: "بيض اومليت دوبل", price: 38, sort_order: 4 },
    { category: "أخرى", name: "بيض اومليت بسطرمة", price: 33, sort_order: 5 },
    { category: "أخرى", name: "بيض بسطرمة دوبل", price: 40, sort_order: 6 },
    { category: "أخرى", name: "بابا غانوج", price: 25, sort_order: 7 },
    {
        category: "أخرى",
        name: "بابا غانوج علي بيض مسلوق",
        price: 30,
        sort_order: 8
    },
    { category: "أخرى", name: "جبنة قريش", price: 26, sort_order: 9 },
    {
        category: "أخرى",
        name: "جبنة قريش علي بيض مسلوق",
        price: 29,
        sort_order: 10
    },
    { category: "أخرى", name: "جبنة مقلية", price: 38, sort_order: 11 },
    { category: "أخرى", name: "جبنة قريش اومليت", price: 32, sort_order: 12 },
    { category: "أخرى", name: "باذنجان", price: 25, sort_order: 13 },
    {
        category: "أخرى",
        name: "باذنجان علي بيض مسلوق",
        price: 28,
        sort_order: 14
    },
    { category: "أخرى", name: "عجه", price: 26, sort_order: 15 },
    { category: "أخرى", name: "مسقعة", price: 26, sort_order: 16 },
    { category: "أخرى", name: "شكشوكة", price: 26, sort_order: 17 },
    { category: "أخرى", name: "ديناميت", price: 35, sort_order: 18 },
    { category: "أخرى", name: "ساندوتش قرنبيط", price: 27, sort_order: 19 }
];

// ── DO NOT EDIT BELOW THIS LINE ─────────────────────────────────

async function seed() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Menu: clear and repopulate so sort_order changes take effect
        await client.query("DELETE FROM menu");
        for (const item of MENU) {
            await client.query(
                "INSERT INTO menu (category, name, price, sort_order) VALUES ($1, $2, $3, $4)",
                [item.category, item.name, item.price, item.sort_order]
            );
        }
        console.log(`✓ Inserted ${MENU.length} menu items`);

        // Names: insert only new ones, skip existing
        let namesAdded = 0;
        for (const name of NAMES) {
            const res = await client.query(
                "INSERT INTO names (name) VALUES ($1) ON CONFLICT DO NOTHING",
                [name.trim()]
            );
            if (res.rowCount > 0) namesAdded++;
        }
        console.log(
            `✓ Inserted ${namesAdded} new names (${NAMES.length - namesAdded} already existed)`
        );

        await client.query("COMMIT");
        console.log("✓ Seed complete");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("✗ Seed failed:", err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
