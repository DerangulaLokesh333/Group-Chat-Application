const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication token is required",
        });
    }

    const token = authHeader.split(" ")[1];

    console.log("Token received:", Boolean(token));
    console.log("JWT secret loaded:", Boolean(process.env.TOKEN_SECRET));

    try {
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

        req.user = decoded;

        console.log("Token verified for user ID:", decoded.id);

        next();
    } catch (error) {
        console.error("JWT verification error:", error.message);

        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
};

module.exports = authenticateUser;