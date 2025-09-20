const { server } = require('../server.js');
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

module.exports = (req, res) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io...');
    res.socket.server.io = io;
  }
  res.end();
};