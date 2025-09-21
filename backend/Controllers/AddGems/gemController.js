// backend/Controllers/AddGems/gemController.js
const fs = require("fs");
const path = require("path");
const Gem = require("../../Models/AddGems/Gem");

const STATUS_MAP = {
  "In Stock": "in_stock",
  in_stock: "in_stock",
  Reserved: "reserved",
  reserved: "reserved",
  Sold: "sold",
  sold: "sold",
  "Out of Stock": "out_of_stock",
  out_of_stock: "out_of_stock",
};

const toPublicPath = (filename) => `/uploads/gems/${filename}`;

// --- CREATE: POST /api/gems  (protected: seller/admin)
exports.createGem = async (req, res) => {
  try {
    const {
      name,
      type,
      carat,
      priceUSD,

      dimensionsMm,
      colorGrade,
      shape,
      clarityGrade,
      cutQuality,
      treatment = "none",

      certificationAgency,
      certificateNumber,

      certificateUrl, // optional text url (if not uploading file)

      status = "in_stock",
      description,
      quality,
      origin,
      sku,
      stock,
    } = req.body || {};

    const caratNum = carat != null && carat !== "" ? Number(carat) : undefined;
    const priceNum =
      priceUSD != null && priceUSD !== "" ? Number(priceUSD) : undefined;
    const stockNum = stock != null && stock !== "" ? Number(stock) : undefined;

    const up = req.files || {};
    const imageFiles = Array.isArray(up.images) ? up.images : [];
    const certFiles = Array.isArray(up.certificate) ? up.certificate : [];

    const images = imageFiles.map((f) => toPublicPath(f.filename));
    const certPath =
      certFiles[0]?.filename ? toPublicPath(certFiles[0].filename) : certificateUrl || "";

    if (!name || !type || caratNum == null || priceNum == null) {
      return res
        .status(400)
        .json({ ok: false, message: "name, type, carat, priceUSD are required" });
    }
    if (!images.length || images.length > 4) {
      return res.status(400).json({
        ok: false,
        message: "Please upload between 1 and 4 images (field name: images)",
      });
    }

    const gem = await Gem.create({
      name,
      type,
      carat: caratNum,
      priceUSD: priceNum,

      dimensionsMm,
      colorGrade,
      shape,
      clarityGrade,
      cutQuality,
      treatment,

      certificationAgency,
      certificateNumber,
      certificateUrl: certPath,

      status: STATUS_MAP[status] || "in_stock",
      description,
      quality,
      origin,
      sku,
      stock: stockNum,

      images,
      createdBy: req.user?.id || req.user?._id,
    });

    res.status(201).json({ ok: true, data: gem });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

// --- LIST (public) : GET /api/gems
// Supports filters used by storefront inventory page
exports.listGems = async (req, res) => {
  try {
    const {
      types,
      treatment,
      priceMax,
      caratMax,
      status,
      q,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = { isActive: true };
    if (types) filter.type = { $in: types.split(",").filter(Boolean) };
    if (treatment && treatment !== "all-treatments") filter.treatment = treatment;
    if (priceMax) filter.priceUSD = { ...(filter.priceUSD || {}), $lte: Number(priceMax) };
    if (caratMax) filter.carat = { ...(filter.carat || {}), $lte: Number(caratMax) };
    if (status && status !== "all") filter.status = STATUS_MAP[status] || status;
    if (q) filter.name = { $regex: q, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Gem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Gem.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      data: items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

// --- RANDOM (public): GET /api/gems/random?limit=6
// Returns a random sample of active/in-stock-ish gems for homepage discovery
exports.publicRandom = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '6', 10), 24);
    // Treat "active" inventory as anything not sold/out_of_stock
    const items = await Gem.aggregate([
      { $match: { isActive: true, status: { $nin: ['sold','out_of_stock'] } } },
      { $sample: { size: limit } },
      { $project: { title: '$name', type: 1, priceUSD: 1, images: 1 } }
    ]);
    res.json({ ok: true, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

// --- LIST MINE (protected seller/admin) : GET /api/gems/mine
exports.listMine = async (req, res) => {
  try {
    const q = { createdBy: req.user?.id || req.user?._id };
    const items = await Gem.find(q).sort({ createdAt: -1 });
    res.json({ ok: true, data: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

// --- GET BY ID (public) : GET /api/gems/:id
exports.getGemById = async (req, res) => {
  try {
    const gem = await Gem.findById(req.params.id);
    if (!gem) return res.status(404).json({ ok: false, message: "Gem not found" });
    res.json({ ok: true, data: gem });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

// --- UPDATE (protected seller/admin) : PUT /api/gems/:id
// Accepts:
// - optional new images via images[] files
// - keepImages: JSON string of URLs to keep
// - optional certificate file (certificate) or certificateUrl text
exports.updateGem = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await Gem.findById(id);
    if (!existing) return res.status(404).json({ ok: false, message: "Gem not found" });

    // ensure owner or admin
    if (
      req.user?.role !== "admin" &&
      String(existing.createdBy || "") !== String(req.user?.id || req.user?._id || "")
    ) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    const body = req.body || {};
    const keepImages = body.keepImages ? JSON.parse(body.keepImages) : [];
    const up = req.files || {};
    const newImageFiles = Array.isArray(up.images) ? up.images : [];
    const newImages = newImageFiles.map((f) => toPublicPath(f.filename));

    const combinedImages = [...keepImages, ...newImages];
    if (!combinedImages.length || combinedImages.length > 4) {
      return res.status(400).json({
        ok: false,
        message: "Please keep/upload between 1 and 4 images",
      });
    }

    const certFiles = Array.isArray(up.certificate) ? up.certificate : [];
    const certificateUrl =
      certFiles[0]?.filename
        ? toPublicPath(certFiles[0].filename)
        : body.certificateUrl ?? existing.certificateUrl;

    const STATUS = body.status ? STATUS_MAP[body.status] || body.status : existing.status;

    existing.name = body.name ?? existing.name;
    existing.type = body.type ?? existing.type;
    existing.carat = body.carat != null ? Number(body.carat) : existing.carat;

    existing.dimensionsMm = body.dimensionsMm ?? existing.dimensionsMm;
    existing.colorGrade = body.colorGrade ?? existing.colorGrade;
    existing.shape = body.shape ?? existing.shape;
    existing.clarityGrade = body.clarityGrade ?? existing.clarityGrade;
    existing.cutQuality = body.cutQuality ?? existing.cutQuality;
    existing.treatment = body.treatment ?? existing.treatment;

    existing.certificationAgency = body.certificationAgency ?? existing.certificationAgency;
    existing.certificateNumber = body.certificateNumber ?? existing.certificateNumber;
    existing.certificateUrl = certificateUrl;

    existing.priceUSD = body.priceUSD != null ? Number(body.priceUSD) : existing.priceUSD;
    existing.status = STATUS;
    existing.description = body.description ?? existing.description;
    existing.quality = body.quality ?? existing.quality;
    existing.origin = body.origin ?? existing.origin;

    existing.sku = body.sku ?? existing.sku;
    existing.stock = body.stock != null ? Number(body.stock) : existing.stock;

    existing.images = combinedImages;

    await existing.save();
    res.json({ ok: true, data: existing });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

// --- DELETE (protected seller/admin) : DELETE /api/gems/:id
exports.deleteGem = async (req, res) => {
  try {
    const id = req.params.id;
    const gem = await Gem.findById(id);
    if (!gem) return res.status(404).json({ ok: false, message: "Gem not found" });

    if (
      req.user?.role !== "admin" &&
      String(gem.createdBy || "") !== String(req.user?.id || req.user?._id || "")
    ) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    await gem.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: e.message });
  }
};
