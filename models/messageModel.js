const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Message = sequelize.define("Message", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id",
        },
    },

    groupId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
});

module.exports = Message;