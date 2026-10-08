const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    hostName: { type: String, required: true },
    rounds: { type: Number, default: 3 },
    completedRounds: { type: Number, default: 0 },
    players: [{
        username: String,
        avatar: String,
        score: Number
    }],
    winners: [String],
    status: { type: String, enum: ["lobby", "playing", "completed"], default: "lobby" },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.Game || mongoose.model("Game", GameSchema);
