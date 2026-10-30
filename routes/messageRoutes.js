const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");
const authenticateUser = require("../middleware/auth");

router.post("/", authenticateUser, messageController.createMessage);

module.exports = router;