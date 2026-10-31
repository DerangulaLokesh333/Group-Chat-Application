const express = require("express");
const router = express.Router();

const groupController = require("../controllers/groupController");
const authenticateUser = require("../middleware/auth");

router.post("/", authenticateUser, groupController.createGroup);
router.get("/", authenticateUser, groupController.getGroups);
router.post("/:groupId/members", authenticateUser, groupController.addMember);

module.exports = router;