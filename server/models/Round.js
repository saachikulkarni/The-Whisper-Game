const mongoose = require("mongoose");

const RoundSchema = new mongoose.Schema({
    gameCode: { type: String, required: true },
    roundNumber: { type: Number, required: true },
    wordAssignments: [{
        giverName: String,
        receiverName: String,
        secretWord: String
    }],
    qaHistory: [{
        askerName: String,
        targetName: String,
        question: String,
        revealedWord: String,
        votes: {
            yes: Number,
            partially: Number,
            no: Number
        },
        pointsAwarded: Number,
        majorityMatch: Boolean
    }],
    roundScores: { type: Map, of: Number },
    winners: [String]
}, { timestamps: true });

module.exports = mongoose.models.Round || mongoose.model("Round", RoundSchema);
