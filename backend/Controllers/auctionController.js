// Controllers/auctionController.js

const Auction = require("../Models/Auction"); // auction model
const Winner = require("../Models/Winner"); // winner model
const { nextAuctionId } = require("../Utills/idGen"); // id generator

function computeStatus(a) {
  // derive status from start/end timestamps
  const now = Date.now();
  const start = new Date(a.startTime).getTime();
  const end = new Date(a.endTime).getTime();
  if (end <= now) return "ended";
  if (start <= now) return "ongoing";
  return "upcoming";
}

// POST /api/auctions (multer sets req.file) – create auction row
exports.create = async (req, res) => {
  try {
    const body = req.body || {}; // read payload
    const title = (body.title || body.name || "").trim(); // normalize title
    const type = body.type; // gem type
    const description = (body.description || "").trim(); // description text
    const basePrice = Number(body.basePrice); // starting price
    const startTime = body.startTime ? new Date(body.startTime) : null; // start time
    const endTime = body.endTime ? new Date(body.endTime) : null; // end time

    if (!title || !type || !basePrice || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" }); // basic validation
    }
    if (startTime >= endTime) {
      return res
        .status(400)
        .json({ message: "End time must be after start time" }); // time order guard
    }

    let imageUrl = body.imageUrl || ""; // image path holder
    if (req.file) imageUrl = `/uploads/${req.file.filename}`; // set uploaded image

    const auctionId = await nextAuctionId(); // generate human code
    const status = computeStatus({ startTime, endTime }); // initial status

    const a = await Auction.create({
      // insert document
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

    return res.status(201).json(a); // respond created row
  } catch (err) {
    console.error("create auction error", err); // log error
    res.status(500).json({ message: "Failed to create auction" }); // server error
  }
};

// GET /api/auctions/:id – fetch one and refresh status if drifted
exports.getOne = async (req, res) => {
  const a = await Auction.findById(req.params.id).lean(); // read doc
  if (!a) return res.status(404).json({ message: "Auction not found" }); // not found
  const liveStatus = computeStatus(a); // recompute status
  if (liveStatus !== a.status) {
    await Auction.updateOne(
      { _id: a._id },
      { $set: { status: liveStatus } }
    ).catch(() => {}); // best-effort sync
  }
  return res.json({ ...a, status: liveStatus }); // return with live status
};

// GET /api/auctions/public – list by filters and attach winner info
exports.publicList = async (req, res) => {
  const { status, q, type, page = 1, pageSize = 12 } = req.query; // read query
  const now = new Date(); // reference time

  const filter = {}; // mongo filter
  if (q) filter.$text = { $search: q }; // text search
  if (type && type !== "all") filter.type = type; // type filter

  if (status === "ongoing") {
    // ongoing window
    filter.startTime = { $lte: now };
    filter.endTime = { $gt: now };
  } else if (status === "upcoming") {
    // upcoming window
    filter.startTime = { $gt: now };
  } else if (status === "ended") {
    // ended window
    filter.endTime = { $lte: now };
  }

  const skip = (Number(page) - 1) * Number(pageSize); // pagination skip
  const items = await Auction.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(pageSize))
    .lean(); // fetch page

  const computed = items.map((i) => ({ ...i, status: computeStatus(i) })); // refresh statuses
  Promise.allSettled(
    // background sync for drifted rows
    computed
      .filter((i, idx) => i.status !== items[idx].status)
      .map((i) =>
        Auction.updateOne({ _id: i._id }, { $set: { status: i.status } })
      )
  ).catch(() => {});

  const endedIds = computed
    .filter((i) => i.status === "ended")
    .map((i) => i._id); // ended ids
  let winMap = new Map(); // winner lookup
  if (endedIds.length) {
    const wins = await Winner.find({ auction: { $in: endedIds } })
      .populate("user", "fullName")
      .lean(); // load winners
    winMap = new Map(wins.map((w) => [String(w.auction), w])); // build map
  }

  const data = computed.map((i) => {
    // attach winner info
    const w = winMap.get(String(i._id));
    return {
      ...i,
      winnerName: w?.user?.fullName || null,
      finalPrice: w?.amount ?? null,
    };
  });

  const total = await Auction.countDocuments(filter); // total count
  res.json({
    items: data,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
  }); // respond list
};

// GET /api/auctions/seller/overview – seller dashboard summary
exports.sellerOverview = async (req, res) => {
  const now = new Date(); // now reference

  const [live, upcoming, ended] = await Promise.all([
    // parallel buckets
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

  const endedIds = ended.map((e) => e._id); // ended ids
  let winMap = new Map(); // winner map
  if (endedIds.length) {
    const wins = await Winner.find({ auction: { $in: endedIds } })
      .populate("user", "fullName")
      .lean(); // load winners
    winMap = new Map(wins.map((w) => [String(w.auction), w])); // map winners
  }
  const endedWithWinners = ended.map((e) => {
    // merge winner info
    const w = winMap.get(String(e._id));
    return {
      ...e,
      winnerName: w?.user?.fullName || null,
      finalPrice: w?.amount ?? null,
    };
  });

  const incomeAgg = await Winner.aggregate([
    { $group: { _id: null, sum: { $sum: "$amount" } } },
  ]); // sum revenue
  const totalIncome = incomeAgg?.[0]?.sum || 0; // revenue number

  res.json({
    // dashboard payload
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

// PATCH /api/auctions/:id – edit only upcoming auctions
exports.updateUpcoming = async (req, res) => {
  const { id } = req.params; // auction id
  const a = await Auction.findById(id); // load doc
  if (!a) return res.status(404).json({ message: "Not found" }); // 404 guard

  const { title, type, description, basePrice, startTime, endTime, imageUrl } =
    req.body || {}; // fields to update
  if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
    return res
      .status(400)
      .json({ message: "End time must be after start time" }); // time guard
  }

  if (title) a.title = title.trim(); // update title
  if (type) a.type = type; // update type
  if (description !== undefined) a.description = String(description).trim(); // update desc
  if (imageUrl !== undefined) a.imageUrl = imageUrl; // update image
  if (basePrice !== undefined) {
    const bp = Number(basePrice); // parse price
    if (!(bp > 0))
      return res.status(400).json({ message: "basePrice must be > 0" }); // price guard
    a.basePrice = bp; // set base
    a.currentPrice = Math.max(a.currentPrice, a.basePrice); // keep floor
  }
  if (startTime) a.startTime = new Date(startTime); // set start
  if (endTime) a.endTime = new Date(endTime); // set end

  a.status = computeStatus(a); // recompute status
  await a.save(); // persist
  res.json(a); // respond updated
};

// DELETE /api/auctions/:id – remove only if still upcoming
exports.deleteUpcoming = async (req, res) => {
  const { id } = req.params; // auction id
  const a = await Auction.findById(id); // load doc
  if (!a) return res.status(404).json({ message: "Not found" }); // not found
  if (computeStatus(a) !== "upcoming" && a.status !== "upcoming") {
    return res
      .status(400)
      .json({ message: "Only upcoming auctions can be deleted" }); // status guard
  }
  await Auction.deleteOne({ _id: id }); // delete row
  res.json({ ok: true }); // success reply
};
