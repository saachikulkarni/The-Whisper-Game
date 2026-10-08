const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chinese_whisper";
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 3000
        });
        isConnected = true;
        console.log("🍃 MongoDB connected successfully at:", uri);
    } catch (err) {
        isConnected = false;
        console.warn("⚠️ MongoDB not connected (" + err.message + "). Operating smoothly in in-memory mode.");
    }
}

function getStatus() {
    return isConnected;
}

module.exports = {
    connectDB,
    getStatus
};
