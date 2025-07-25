#!/usr/bin/env node

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = 3002;

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('ping', (data) => {
    console.log('Received ping:', data);
    socket.emit('pong', { message: 'pong', timestamp: new Date().toISOString() });
  });
  
  socket.on('echo', (data) => {
    console.log('Received echo:', data);
    socket.emit('echo', data);
  });
  
  socket.on('test', (data) => {
    console.log('Received test:', data);
    socket.emit('test-response', { 
      received: data, 
      serverTime: new Date().toISOString(),
      socketId: socket.id 
    });
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`Test WebSocket server running on port ${PORT}`);
});