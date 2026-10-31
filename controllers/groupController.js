const { Op } = require("sequelize");
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

        await GroupMember.create(
            {
                groupId: group.id,
                userId: req.user.id,
                isAdmin: true,
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
                isAdmin: true,
            },
        });
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        console.error("Create group error:", error);
        return res.status(500).json({ message: "Unable to create group" });
    }
};

const getGroups = async (req, res) => {
    try {
        const memberships = await GroupMember.findAll({
            where: { userId: req.user.id },
            attributes: ["groupId", "isAdmin"],
            include: [
                {
                    model: Group,
                    attributes: ["id", "name", "createdBy"],
                },
            ],
        });

        const groups = memberships
            .filter((membership) => membership.Group)
            .map((membership) => ({
                ...membership.Group.get({ plain: true }),
                isAdmin: membership.isAdmin,
            }));

        return res.status(200).json({ groups });
    } catch (error) {
        console.error("Get groups error:", error);
        return res.status(500).json({ message: "Unable to fetch groups" });
    }
};

const checkGroupAdmin = async (groupId, userId) => {
    return GroupMember.findOne({
        where: { groupId, userId, isAdmin: true },
    });
};

// Search registered users by name, email, or phone.
// Only admins of the specified group may search for members to add.
const searchUsers = async (req, res) => {
    try {
        const groupId = Number(req.params.groupId);
        const searchTerm = req.query.q?.trim();

        if (!Number.isInteger(groupId) || groupId <= 0) {
            return res.status(400).json({ message: "Valid group ID is required" });
        }

        if (!searchTerm) {
            return res.status(400).json({ message: "Search term is required" });
        }

        const group = await Group.findByPk(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const adminMembership = await checkGroupAdmin(groupId, req.user.id);

        if (!adminMembership) {
            return res.status(403).json({
                message: "Only group admins can search for users to add",
            });
        }

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: `%${searchTerm}%` } },
                    { email: { [Op.like]: `%${searchTerm}%` } },
                    { phone: { [Op.like]: `%${searchTerm}%` } },
                ],
                id: { [Op.ne]: req.user.id },
            },
            attributes: ["id", "name", "email", "phone"],
            limit: 20,
            order: [["name", "ASC"]],
        });

        return res.status(200).json({ users });
    } catch (error) {
        console.error("Search users error:", error);
        return res.status(500).json({ message: "Unable to search users" });
    }
};

const addMember = async (req, res) => {
    try {
        const groupId = Number(req.params.groupId);
        const userId = Number(req.body.userId);

        if (
            !Number.isInteger(groupId) ||
            groupId <= 0 ||
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                message: "Valid group ID and user ID are required",
            });
        }

        const group = await Group.findByPk(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const adminMembership = await checkGroupAdmin(groupId, req.user.id);

        if (!adminMembership) {
            return res.status(403).json({
                message: "Only group admins can add users",
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

        await GroupMember.create({
            groupId,
            userId,
            isAdmin: false,
        });

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

const promoteMember = async (req, res) => {
    try {
        const groupId = Number(req.params.groupId);
        const userId = Number(req.params.userId);

        if (
            !Number.isInteger(groupId) ||
            groupId <= 0 ||
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                message: "Valid group ID and user ID are required",
            });
        }

        const group = await Group.findByPk(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const adminMembership = await checkGroupAdmin(groupId, req.user.id);

        if (!adminMembership) {
            return res.status(403).json({
                message: "Only group admins can promote members",
            });
        }

        const membership = await GroupMember.findOne({
            where: { groupId, userId },
        });

        if (!membership) {
            return res.status(404).json({
                message: "User is not a member of this group",
            });
        }

        if (membership.isAdmin) {
            return res.status(409).json({
                message: "User is already an admin",
            });
        }

        await membership.update({ isAdmin: true });

        return res.status(200).json({
            message: "Member promoted to admin successfully",
        });
    } catch (error) {
        console.error("Promote member error:", error);
        return res.status(500).json({
            message: "Unable to promote member",
        });
    }
};

const removeMember = async (req, res) => {
    try {
        const groupId = Number(req.params.groupId);
        const userId = Number(req.params.userId);

        if (
            !Number.isInteger(groupId) ||
            groupId <= 0 ||
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                message: "Valid group ID and user ID are required",
            });
        }

        const group = await Group.findByPk(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const adminMembership = await checkGroupAdmin(groupId, req.user.id);

        if (!adminMembership) {
            return res.status(403).json({
                message: "Only group admins can remove members",
            });
        }

        if (userId === group.createdBy) {
            return res.status(400).json({
                message: "The group creator cannot be removed",
            });
        }

        const membership = await GroupMember.findOne({
            where: { groupId, userId },
        });

        if (!membership) {
            return res.status(404).json({
                message: "User is not a member of this group",
            });
        }

        await membership.destroy();

        return res.status(200).json({
            message: "Member removed from group successfully",
        });
    } catch (error) {
        console.error("Remove member error:", error);
        return res.status(500).json({
            message: "Unable to remove member",
        });
    }
};

const getGroupMembers = async (req, res) => {
    try {
        const groupId = Number(req.params.groupId);

        if (!Number.isInteger(groupId) || groupId <= 0) {
            return res.status(400).json({ message: "Valid group ID is required" });
        }

        const group = await Group.findByPk(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const requesterMembership = await GroupMember.findOne({
            where: { groupId, userId: req.user.id },
        });

        if (!requesterMembership) {
            return res.status(403).json({
                message: "Only group members can view group members",
            });
        }

        const members = await GroupMember.findAll({
            where: { groupId },
            attributes: ["userId", "isAdmin"],
            include: [
                {
                    model: User,
                    attributes: ["id", "name", "email", "phone"],
                },
            ],
            order: [["id", "ASC"]],
        });

        return res.status(200).json({
            members: members.map((membership) => ({
                id: membership.User.id,
                name: membership.User.name,
                email: membership.User.email,
                phone: membership.User.phone,
                isAdmin: membership.isAdmin,
            })),
        });
    } catch (error) {
        console.error("Get group members error:", error);
        return res.status(500).json({
            message: "Unable to fetch group members",
        });
    }
};

module.exports = {
    createGroup,
    getGroups,
    getGroupMembers,
    searchUsers,
    addMember,
    promoteMember,
    removeMember,
};