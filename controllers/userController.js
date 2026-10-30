const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

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

const secretKey = process.env.TOKEN_SECRET;
console.log("JWT secret loaded:", Boolean(secretKey));

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "User not authorized",
            });
        }

        const token = jwt.sign(
            { id: user.id },
            secretKey,
            { expiresIn: "1h" }
        );

        console.log("Login user:", user.id, user.email);

        return res.status(200).json({
            message: "Login successful",
            token,
        });
    } catch (err) {
        console.error("Error logging in user:", err);
        return res.status(500).json({
            message: "Error logging in user",
        });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ["id", "name", "email"]
        });

        return res.status(200).json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({
            message: "Error fetching users"
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUsers,
};