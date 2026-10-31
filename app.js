
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

const sequelize = require("./config/database");

const User = require("./models/userModel");
const Message = require("./models/messageModel");

const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const groupRoutes = require("./routes/groupRoutes");

const Group = require("./models/groupModel");
const GroupMember = require("./models/groupMemberModel");

const app = express();
const PORT = 3000;

User.hasMany(Message, {
    foreignKey: "userId",
});

Message.belongsTo(User, {
    foreignKey: "userId",
});

User.hasMany(GroupMember, { foreignKey: "userId" });
GroupMember.belongsTo(User, { foreignKey: "userId" });

Group.hasMany(GroupMember, { foreignKey: "groupId" });
GroupMember.belongsTo(Group, { foreignKey: "groupId" });

User.hasMany(Group, { foreignKey: "createdBy" });
Group.belongsTo(User, { foreignKey: "createdBy" });

// Allow requests from the Live Server frontend

// Allow requests from the Live Server frontend
app.use(cors({
    origin: "http://127.0.0.1:5500",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
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
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

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
