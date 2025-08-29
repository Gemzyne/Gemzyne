const router = require('express').Router();
const { requireAuth, requireRoles } = require('../Middleware/auth');
const adminUsers = require('../Controllers/AdminUsersController');

router.use(requireAuth, requireRoles('admin'));

router.get('/', adminUsers.getAllUsers);
router.post('/', adminUsers.addUser);
router.get('/:id', adminUsers.getById);
router.patch('/:id', adminUsers.updateUser);
router.delete('/:id', adminUsers.deleteUser);

module.exports = router;
