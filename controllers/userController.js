const User = require("../models/userModel");
const bcrypt = require("bcrypt");

const registerUser = async (req, res) => {
    const { name, email, phone, password } = req.body;

    try {
        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            return res.status(400).send("User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
        });

        res.status(201).send("User registered successfully!");
    } catch (err) {
        console.error("Error creating user:", err);
        res.status(500).send("Error registering user");
    }
};

module.exports = {
    registerUser,
};