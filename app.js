
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

const sequelize = require("./config/database");
require("./models/userModel");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = 3000;

// Allow requests from the Live Server frontend
app.use(cors({
    origin: "http://127.0.0.1:5500",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));

// Login page
app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

// Chat page
app.get("/chat.html", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "chat.html"));
});

// Signup page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "signup.html"));
});

// User APIs
app.use("/api/users", userRoutes);

// Connect to database and start server
sequelize.sync()
    .then(() => {
        console.log("Database connected and tables synchronized");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Unable to connect to the database:", error);
    });
