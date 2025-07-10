import express from "express";
import cors from "cors";
import { initDb, InitiliazeDbTables, UpdateUserOnlineStatus } from "./database.js";
import servefile from "./serveIndex.js";
import { CallEndpoint } from "./EndPoints.js";
import dotenv from "dotenv";
import { WebSocketServer } from 'ws';
import http from "http";

dotenv.config();

const app = express();

// Database
var db = initDb();
console.log('Database initialized successfully');

//intiliaze Database tables
InitiliazeDbTables(db);
console.log('Database tables initialized successfully');

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'file://'],
    credentials: true
}));

app.use(express.json());

//create an http server
const server= http.createServer(app);

//bind and create a websocket server
const wss = new WebSocketServer({ server });

// Handle connection
const connections = {}; // Phonebook: { username: { socket, online } }

wss.on('connection', (ws) => {
    let username=null;

    ws.on('message', (message) => {
       let data;

       // Try parsing the message
    try {
      data = JSON.parse(message);
    } catch (err) {
      ws.send(JSON.stringify({ error: "Invalid message format" }));
      return;
    }

    if (data.type === 'status') {
        username = data.userId;
        connections[username] = { socket: ws, online: true };
        console.log(`${username} connected`);
        UpdateUserOnlineStatus(db, username, true); 
        ws.send(JSON.stringify({ type: 'status', status: 'online' }));
    }else if (data.type === 'testConnection'){ 
         console.log('Connection Established');
         ws.send(JSON.stringify({ type: 'testConnection', success: true }));
    }



    });
    ws.on('close', () => {
        if (username && connections[username]) {
            connections[username].online = false;
            UpdateUserOnlineStatus(db, username, false);
            console.log(`${username} disconnected`);
          }
    });
});

//serrve file
servefile(app)

//handle endpoints
CallEndpoint(app, db)

const PORT = process.env.PORT || 3000;

// Add error handling for the server
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Backend server is running on http://localhost:${PORT}...`);
    console.log(`📊 Database connected successfully`);

}).on('error', (err) => {
    console.error('Failed to start server:', err);
});
