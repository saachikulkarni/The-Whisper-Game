const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend files
app.use(express.static(path.join(__dirname, "../client")));

// When a player connects
io.on("connection", (socket) => {
    console.log("A player connected:", socket.id);

    // When a player disconnects
    socket.on("disconnect", () => {
        console.log("A player disconnected:", socket.id);
    });
});

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Chinese Whisper server running at http://localhost:${PORT}`);
});