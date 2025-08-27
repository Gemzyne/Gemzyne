const User = require('../Model/UserModel');
//Display
const getAllUsers = async (req, res) => {

    let Users;
    try {
        Users = await User.find();
    } catch (err) {
         console.log(err);
    }
    // if no users found
    if (!Users) {
        return res.status(404).json({ message: 'No Users found' });
    }
    //Display all users
    return res.status(200).json({ Users });
};

//Data insert
const addUser = async (req, res) => {
    const { fullName, email, phone, password, role } = req.body;

    let users;
    try {
        users = new User({
            fullName,
            email,
            phone,
            password,
            role
        });
        await users.save();
    } catch (err) {
        console.log(err);
    }
    //not inserted
    if (!users) {
        return res.status(400).send({ message: 'Unable to add user' });
    }
    return res.status(201).send({ users });
};
//Get by ID
const getById = async (req, res,next) => {
    const id = req.params.id;
    let user;
    try {
        user = await User.findById(id);
    } catch (err) {
        console.log(err);
    }
 //not available users
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }
    return res.status(201).json({ user });
};

//Update User Details
const updateUser = async (req, res, next) => {
    const id = req.params.id;
    const { fullName, email, phone, password, role } = req.body;
    let user;
    try {
        user = await User.findByIdAndUpdate(id, {
            fullName: fullName,
            email: email,
            phone: phone,
            password: password,
            role: role
        });
        user = await user.save();
    } catch (err) {
        console.log(err);
    }
    //not updated
    if (!user) {
        return res.status(404).json({ message: 'Unable to update by this ID' });
    }
    return res.status(200).json({ user });
};

//Delete User
const deleteUser = async (req, res, next) => {
    const id = req.params.id;
    let user;
    try {
        user = await User.findByIdAndDelete(id);
    } catch (err) {
        console.log(err);
    }
    //not deleted
    if (!user) {
        return res.status(404).json({ message: 'Unable to delete by this ID' });
    }
    return res.status(200).json({ message: 'User deleted successfully' });
};

exports.getAllUsers = getAllUsers;
exports.addUser = addUser;
exports.getById = getById;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;