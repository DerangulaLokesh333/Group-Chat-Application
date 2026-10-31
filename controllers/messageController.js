const { Op } = require("sequelize");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const GroupMember = require("../models/groupMemberModel");

const createMessage = async (req, res) => {
    try {
        const { message, groupId: rawGroupId } = req.body;
        const groupId = Number(rawGroupId);

        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Message is required" });
        }

        if (!Number.isInteger(groupId) || groupId <= 0) {
            return res.status(400).json({ message: "Valid group ID is required" });
        }

        const membership = await GroupMember.findOne({
            where: { groupId, userId: req.user.id },
        });

        if (!membership) {
            return res.status(403).json({
                message: "You are not a member of this group",
            });
        }

        const newMessage = await Message.create({
            userId: req.user.id,
            groupId,
            message: message.trim(),
        });

        const savedMessage = await Message.findByPk(newMessage.id, {
            include: [
                {
                    model: User,
                    attributes: ["id", "name"],
                },
            ],
        });

        return res.status(201).json(savedMessage);
    } catch (error) {
        console.error("Create message error:", error);
        return res.status(500).json({ message: "Unable to send message" });
    }
};

const getMessages = async (req, res) => {
    try {
        const groupId = Number(req.query.groupId);
        const lastMessageId = Number(req.query.lastMessageId) || 0;

        if (!Number.isInteger(groupId) || groupId <= 0) {
            return res.status(400).json({ message: "Valid group ID is required" });
        }

        const membership = await GroupMember.findOne({
            where: { groupId, userId: req.user.id },
        });

        if (!membership) {
            return res.status(403).json({
                message: "You are not a member of this group",
            });
        }

        const messages = await Message.findAll({
            where: {
                groupId,
                id: { [Op.gt]: lastMessageId },
            },
            include: [
                {
                    model: User,
                    attributes: ["id", "name"],
                },
            ],
            order: [["id", "ASC"]],
        });

        return res.status(200).json(messages);
    } catch (error) {
        console.error("Get messages error:", error);
        return res.status(500).json({ message: "Unable to fetch messages" });
    }
};

module.exports = {
    createMessage,
    getMessages,
};