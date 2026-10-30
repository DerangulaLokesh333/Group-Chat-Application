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

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "signup.html"));
});

app.use("/api/users", userRoutes);

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