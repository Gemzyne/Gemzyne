// backend/Controllers/OrderController.js
const CustomOrder = require('../Models/CustomOrderModel');
const Gem = require('../Models/AddGems/Gem');

// fallback only if a gem has no gemId (should be rare)
function nextOrderNo() {
  return `ORD-${Date.now()}`;
}

/**
 * POST /api/orders/from-gem/:gemId
 * Creates a CustomOrder for an inventory Gem to reuse the checkout page.
 * Must be called with a logged-in user (router already uses requireAuth).
 */
exports.createFromGem = async (req, res, next) => {
  try {
    // 1) auth guard (support both .id and ._id)
    const buyerId = req.user?.id || req.user?._id;
    if (!buyerId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    // 2) fetch gem safely (handle malformed ids)
    const { gemId } = req.params;
    let gem;
    try {
      gem = await Gem.findById(gemId);
    } catch {
      return res.status(400).json({ ok: false, message: 'Invalid gem id' });
    }
    if (!gem) return res.status(404).json({ ok: false, message: 'Gem not found' });

    // 3) validate price
    const priceUSD = Number(gem.priceUSD ?? 0);
    if (!Number.isFinite(priceUSD) || priceUSD < 0) {
      return res.status(400).json({ ok: false, message: 'Gem has no valid price' });
    }

    // 4) Build the exact shape you requested
    const orderNo = gem.gemId || nextOrderNo(); // GM code preferred

    const selections = {
      source: 'inventory',

      // — summary for Payment page —
      type: gem.type || null,
      shape: gem.shape || null,
      weight: Number(gem.carat ?? 0),
       grade: 'N/A',
      polish: 'good',
      symmetry: 'good',

      // small snapshot if you want later (harmless if schema ignores)
      gem: {
        id: gem._id,
        gemId: gem.gemId || null,
        name: gem.name || null,
        images: Array.isArray(gem.images) ? gem.images.slice(0, 4) : [],
        certificateUrl: gem.certificateUrl || '',
      },
    };

    const orderDoc = {
      orderNo,                            // ← GM code here
      title: gem.name || gem.gemId || 'Gem',
      selections,
      buyerId,
      currency: 'USD',
      pricing: { subtotal: priceUSD },
      status: 'pending',
      gemId: gem._id,                     // optional link-back; okay if schema ignores
    };

    const order = await CustomOrder.create(orderDoc);

    // Reserve gem AFTER creating order (don’t break the flow if it fails)
    try {
      if (gem.status === 'in_stock') {
        gem.status = 'reserved';
        await gem.save();
      }
    } catch (e) {
      console.warn('Could not reserve gem', gem._id, e);
    }

    return res.status(201).json({ ok: true, order });
  } catch (err) {
    console.error('createFromGem error:', err);
    return next(err);
  }
};
