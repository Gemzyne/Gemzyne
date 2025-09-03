const Auction = require("../Models/Auction");
const Winner = require("../Models/Winner");
const { nextAuctionId } = require("../Utills/idGen"); // keep your existing path

function computeStatus(a) {
  const now = Date.now();
  const start = new Date(a.startTime).getTime();
  const end = new Date(a.endTime).getTime();
  if (end <= now) return "ended";
  if (start <= now) return "ongoing";
  return "upcoming";
}

// CREATE (image handled by Multer in AuctionRoutes)
exports.create = async (req, res) => {
  try {
    const body = req.body || {};
    const title = (body.title || body.name || "").trim();
    const type = body.type;
    const description = (body.description || "").trim();
    const basePrice = Number(body.basePrice);
    const startTime = body.startTime ? new Date(body.startTime) : null;
    const endTime = body.endTime ? new Date(body.endTime) : null;

    if (!title || !type || !basePrice || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (startTime >= endTime) {
      return res
        .status(400)
        .json({ message: "End time must be after start time" });
    }

    let imageUrl = body.imageUrl || "";
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;

    const auctionId = await nextAuctionId();
    const status = computeStatus({ startTime, endTime });

    const a = await Auction.create({
      auctionId,
      title,
      type,
      description,
      imageUrl,
      basePrice,
      currentPrice: basePrice,
      startTime,
      endTime,
      status,
      sellerId: req.user?.id || null,
    });

    return res.status(201).json(a);
  } catch (err) {
    console.error("create auction error", err);
    res.status(500).json({ message: "Failed to create auction" });
  }
};

exports.getOne = async (req, res) => {
  const a = await Auction.findById(req.params.id).lean();
  if (!a) return res.status(404).json({ message: "Auction not found" });
  const liveStatus = computeStatus(a);
  if (liveStatus !== a.status) {
    await Auction.updateOne(
      { _id: a._id },
      { $set: { status: liveStatus } }
    ).catch(() => {});
  }
  return res.json({ ...a, status: liveStatus });
};

/**
 * Public list with time-based buckets and winner info on ended rows.
 * Response: { items:[ {..., winnerName, finalPrice } ], total, page, pageSize }
 */
exports.publicList = async (req, res) => {
  const { status, q, type, page = 1, pageSize = 12 } = req.query;
  const now = new Date();

  const filter = {};
  if (q) filter.$text = { $search: q };
  if (type && type !== "all") filter.type = type;

  if (status === "ongoing") {
    filter.startTime = { $lte: now };
    filter.endTime = { $gt: now };
  } else if (status === "upcoming") {
    filter.startTime = { $gt: now };
  } else if (status === "ended") {
    filter.endTime = { $lte: now };
  }

  const skip = (Number(page) - 1) * Number(pageSize);
  const items = await Auction.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(pageSize))
    .lean();

  const computed = items.map((i) => ({ ...i, status: computeStatus(i) }));
  Promise.allSettled(
    computed
      .filter((i, idx) => i.status !== items[idx].status)
      .map((i) =>
        Auction.updateOne({ _id: i._id }, { $set: { status: i.status } })
      )
  ).catch(() => {});

  // Attach winner name + final price for ended rows
  const endedIds = computed
    .filter((i) => i.status === "ended")
    .map((i) => i._id);
  let winMap = new Map();
  if (endedIds.length) {
    const wins = await Winner.find({ auction: { $in: endedIds } })
      .populate("user", "fullName")
      .lean();
    winMap = new Map(wins.map((w) => [String(w.auction), w]));
  }

  const data = computed.map((i) => {
    const w = winMap.get(String(i._id));
    return {
      ...i,
      winnerName: w?.user?.fullName || null,
      finalPrice: w?.amount ?? null,
    };
  });

  const total = await Auction.countDocuments(filter);
  res.json({
    items: data,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
  });
};

exports.sellerOverview = async (req, res) => {
  const now = new Date();

  const [live, upcoming, ended] = await Promise.all([
    Auction.find({ startTime: { $lte: now }, endTime: { $gt: now } })
      .sort({ endTime: 1 })
      .lean(),
    Auction.find({ startTime: { $gt: now } })
      .sort({ startTime: 1 })
      .lean(),
    Auction.find({ endTime: { $lte: now } })
      .sort({ endTime: -1 })
      .limit(200)
      .lean(),
  ]);

  // attach winners to ended rows
  const endedIds = ended.map((e) => e._id);
  let winMap = new Map();
  if (endedIds.length) {
    const wins = await Winner.find({ auction: { $in: endedIds } })
      .populate("user", "fullName")
      .lean();
    winMap = new Map(wins.map((w) => [String(w.auction), w]));
  }
  const endedWithWinners = ended.map((e) => {
    const w = winMap.get(String(e._id));
    return {
      ...e,
      winnerName: w?.user?.fullName || null,
      finalPrice: w?.amount ?? null,
    };
  });

  const incomeAgg = await Winner.aggregate([
    { $group: { _id: null, sum: { $sum: "$amount" } } },
  ]);
  const totalIncome = incomeAgg?.[0]?.sum || 0;

  res.json({
    totals: {
      income: totalIncome,
      totalAuctions: live.length + upcoming.length + ended.length,
      ongoing: live.length,
      sold: ended.length,
    },
    live,
    upcoming,
    recent: endedWithWinners.slice(0, 6),
    history: endedWithWinners,
  });
};

exports.updateUpcoming = async (req, res) => {
  const { id } = req.params;
  const a = await Auction.findById(id);
  if (!a) return res.status(404).json({ message: "Not found" });

  const { title, type, description, basePrice, startTime, endTime, imageUrl } =
    req.body || {};
  if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
    return res
      .status(400)
      .json({ message: "End time must be after start time" });
  }

  if (title) a.title = title.trim();
  if (type) a.type = type;
  if (description !== undefined) a.description = String(description).trim();
  if (imageUrl !== undefined) a.imageUrl = imageUrl;
  if (basePrice !== undefined) {
    const bp = Number(basePrice);
    if (!(bp > 0))
      return res.status(400).json({ message: "basePrice must be > 0" });
    a.basePrice = bp;
    a.currentPrice = Math.max(a.currentPrice, a.basePrice);
  }
  if (startTime) a.startTime = new Date(startTime);
  if (endTime) a.endTime = new Date(endTime);

  a.status = computeStatus(a);
  await a.save();
  res.json(a);
};

exports.deleteUpcoming = async (req, res) => {
  const { id } = req.params;
  const a = await Auction.findById(id);
  if (!a) return res.status(404).json({ message: "Not found" });
  if (computeStatus(a) !== "upcoming" && a.status !== "upcoming") {
    return res
      .status(400)
      .json({ message: "Only upcoming auctions can be deleted" });
  }
  await Auction.deleteOne({ _id: id });
  res.json({ ok: true });
};
