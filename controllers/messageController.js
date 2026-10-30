const Message = require("../models/messageModel");

const createMessage = async (req, res) => {
    const { message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({
            message: "Message cannot be empty",
        });
    }

    try {
        const newMessage = await Message.create({
            userId: req.user.id,
            message: message.trim(),
        });

        return res.status(201).json({
            message: "Message saved successfully",
            data: newMessage,
        });
    } catch (error) {
        console.error("Error saving message:", error);

        return res.status(500).json({
            message: "Error saving message",
        });
    }
};

const User = require("../models/userModel");

// Get all messages from the database
const getMessages = async (req, res) => {
    try {
        const messages = await Message.findAll({
            include: [
                {
                    model: User,
                    attributes: ["id", "name"],
                },
            ],
            order: [["createdAt", "ASC"]],
        });

        return res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);

        return res.status(500).json({
            message: "Error fetching messages",
        });
    }
};

module.exports = {
    createMessage,
    getMessages,
};