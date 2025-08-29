const User = require('../Models/UserModel');

function safe(u) {
  const o = u.toObject ? u.toObject() : u;
  delete o.passwordHash;
  return o;
}

// GET /admin/users?q=&role=&status=&page=&limit=
exports.getAllUsers = async (req, res) => {
  try {
    const { q, role, status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (q) filter.$or = [
      { email: new RegExp(q, 'i') },
      { fullName: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
    ];
    if (role) filter.role = role;
    if (status) filter.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      User.countDocuments(filter),
    ]);

    res.json({ users: users.map(safe), total, page: pageNum, limit: limitNum });
  } catch (e) {
    console.error('getAllUsers', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /admin/users
exports.addUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, role = 'buyer', status = 'active' } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email and password are required' });
    }

    const exists = await User.findOne({ $or: [{ email }, ...(phone ? [{ phone }] : [])] });
    if (exists) return res.status(400).json({ message: 'Email or phone already registered' });

    const allowedRoles = ['buyer', 'seller', 'admin'];
    const roleSafe = allowedRoles.includes(role) ? role : 'buyer';

    const user = new User({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      role: roleSafe,
      status: status === 'suspended' ? 'suspended' : 'active',
    });
    await user.setPassword(password);
    await user.save();

    res.status(201).json({ user: safe(user) });
  } catch (e) {
    console.error('addUser', e);
    if (e?.code === 11000) return res.status(400).json({ message: 'Email or phone already registered' });
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /admin/users/:id
exports.getById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: safe(user) });
  } catch (e) {
    console.error('getById', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /admin/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, role, status } = req.body;
    const user = await User.findById(req.params.id).select('+passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (typeof fullName === 'string') user.fullName = fullName.trim();
    if (typeof email === 'string') user.email = email.trim().toLowerCase();
    if (typeof phone === 'string') user.phone = phone.trim();

    const allowedRoles = ['buyer', 'seller', 'admin'];
    if (typeof role === 'string' && allowedRoles.includes(role)) user.role = role;
    if (status === 'active' || status === 'suspended') user.status = status;

    if (typeof password === 'string' && password.length >= 6) {
      await user.setPassword(password);
    }

    await user.save();
    res.json({ user: safe(user) });
  } catch (e) {
    console.error('updateUser', e);
    if (e?.code === 11000) return res.status(400).json({ message: 'Email or phone already in use' });
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (e) {
    console.error('deleteUser', e);
    res.status(500).json({ message: 'Server error' });
  }
};
