const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on("connection", socket => {
  socket.on("playerMove", data => {
    socket.broadcast.emit("playerMove", {
      id: socket.id,
      x: data.x,
      y: data.y,
      z: data.z,
      rotation: data.rotation
    });
  });

  socket.on("disconnect", () => {
    io.emit("playerLeft", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Gra działa na porcie " + PORT);
});
