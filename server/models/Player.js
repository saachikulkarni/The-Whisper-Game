const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
    username: { type: String, required: true },
    avatar: { type: String, default: "🦊" },
    totalGamesPlayed: { type: Number, default: 0 },
    totalGamesWon: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Player || mongoose.model("Player", PlayerSchema);
