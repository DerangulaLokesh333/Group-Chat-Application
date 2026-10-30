const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");
const authenticateUser = require("../middleware/auth");

router.get("/", authenticateUser, messageController.getMessages);

router.post("/", authenticateUser, messageController.createMessage);

module.exports = router;