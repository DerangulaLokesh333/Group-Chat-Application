const express = require("express");
const router = express.Router();

const groupController = require("../controllers/groupController");
const authenticateUser = require("../middleware/auth");

router.post("/", authenticateUser, groupController.createGroup);
router.get("/", authenticateUser, groupController.getGroups);

// Search registered users by name, email, or phone.
router.get(
    "/:groupId/users/search",
    authenticateUser,
    groupController.searchUsers
);

// Add a member (admin only; checked in the controller).
router.post(
    "/:groupId/members",
    authenticateUser,
    groupController.addMember
);

// Promote a group member to admin.
router.patch(
    "/:groupId/members/:userId/admin",
    authenticateUser,
    groupController.promoteMember
);

// Remove a member from a group.
router.delete(
    "/:groupId/members/:userId",
    authenticateUser,
    groupController.removeMember
);

router.get(
    "/:groupId/members",
    authenticateUser,
    groupController.getGroupMembers
);

module.exports = router;