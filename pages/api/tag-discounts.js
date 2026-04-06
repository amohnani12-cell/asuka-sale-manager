// pages/api/tag-discounts.js
// Auto-tags products with discount slabs based on compare_at_price vs price
// Tags: discount-10 (1-10%), discount-20 (11-20%), discount-30 (21-30%), discount-40 (31-40%), discount-40plus (41%+)

const DISCOUNT_TAGS = ['discount-10', 'discount-20', 'discount-30', 'discount-40', 'discount-40plus'];

function getDiscountTag(price, compareAt) {
  if (!compareAt || compareAt <= price) return null;
  const pct = Math.round((1 - price / compareAt) * 100);
  if (pct <= 10) return 'discount-10';
  if (pct <= 20) return 'discount-20';
  if (pct <= 30) return 'discount-30';
  if (pct <= 40) return 'discount-40';
  return 'discount-40plus';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { productIds } = req.body; // array of { id, price, compareAt, tags }
  if (!productIds || !productIds.length) return res.status(400).json({ error: 'No products provided' });

  const S = process.env.SHOPIFY_STORE;
  const T = process.env.SHOPIFY_TOKEN;

  const results = [];

  for (const p of productIds) {
    try {
      const newTag = getDiscountTag(p.price, p.compareAt);

      // Remove all existing discount tags, then add the correct one
      const existingTags = (p.tags || '').split(',').map(t => t.trim()).filter(t => !DISCOUNT_TAGS.includes(t));
      const updatedTags = newTag ? [...existingTags, newTag].join(', ') : existingTags.join(', ');

      const r = await fetch(`https://${S}/admin/api/2024-01/products/${p.id}.json`, {
        method: 'PUT',
        headers: { 'X-Shopify-Access-Token': T, 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: { id: p.id, tags: updatedTags } }),
      });

      const d = await r.json();
      results.push({ id: p.id, success: !!d.product, tag: newTag });
    } catch (e) {
      results.push({ id: p.id, success: false, error: e.message });
    }
  }

  return res.json({
    done: results.filter(r => r.success).length,
    total: results.length,
    results,
  });
}
