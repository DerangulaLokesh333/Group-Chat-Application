const Group = require("../models/groupModel");
const GroupMember = require("../models/groupMemberModel");
const User = require("../models/userModel");
const sequelize = require("../config/database");

const createGroup = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            await transaction.rollback();
            return res.status(400).json({ message: "Group name is required" });
        }

        const group = await Group.create(
            {
                name: name.trim(),
                createdBy: req.user.id,
            },
            { transaction }
        );

        // Automatically add the creator as a group member.
        await GroupMember.create(
            {
                groupId: group.id,
                userId: req.user.id,
            },
            { transaction }
        );

        await transaction.commit();

        return res.status(201).json({
            message: "Group created successfully",
            group: {
                id: group.id,
                name: group.name,
                createdBy: group.createdBy,
            },
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Create group error:", error);
        return res.status(500).json({ message: "Unable to create group" });
    }
};

const getGroups = async (req, res) => {
    try {
        const memberships = await GroupMember.findAll({
            where: { userId: req.user.id },
            attributes: ["groupId"],
            include: [
                {
                    model: Group,
                    attributes: ["id", "name", "createdBy"],
                },
            ],
        });

        const groups = memberships
            .map((membership) => membership.Group)
            .filter(Boolean);

        return res.status(200).json({ groups });
    } catch (error) {
        console.error("Get groups error:", error);
        return res.status(500).json({ message: "Unable to fetch groups" });
    }
};

const addMember = async (req, res) => {
    try {
        const groupId = Number(req.params.groupId);
        const userId = Number(req.body.userId);

        if (!Number.isInteger(groupId) || groupId <= 0 ||
            !Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                message: "Valid group ID and user ID are required",
            });
        }

        const group = await Group.findByPk(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Only an existing group member can invite another user.
        const requesterMembership = await GroupMember.findOne({
            where: { groupId, userId: req.user.id },
        });

        if (!requesterMembership) {
            return res.status(403).json({
                message: "Only group members can invite users",
            });
        }

        const invitedUser = await User.findByPk(userId);

        if (!invitedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const existingMembership = await GroupMember.findOne({
            where: { groupId, userId },
        });

        if (existingMembership) {
            return res.status(409).json({
                message: "User is already a member of this group",
            });
        }

        await GroupMember.create({ groupId, userId });

        return res.status(201).json({
            message: "User added to group successfully",
        });
    } catch (error) {
        console.error("Add group member error:", error);
        return res.status(500).json({
            message: "Unable to add user to group",
        });
    }
};

module.exports = {
    createGroup,
    getGroups,
    addMember,
};