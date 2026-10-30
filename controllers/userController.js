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

        await User.create({
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

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Incorrect password",
            });
        }

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (err) {
        console.error("Error logging in:", err);
        res.status(500).json({
            message: "Error logging in",
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
};