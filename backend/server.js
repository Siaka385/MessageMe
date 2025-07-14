import express from "express";
import cors from "cors";
import { initDb, InitiliazeDbTables, UpdateUserOnlineStatus } from "./database.js";
import servefile from "./serveIndex.js";
import { CallEndpoint } from "./EndPoints.js";
import dotenv from "dotenv";
import { WebSocketServer } from "ws"
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
    let userId = null;

    ws.on('message', (message) => {
        let data;

        // Try parsing the message
        try {
            data = JSON.parse(message);
        } catch (err) {
            ws.send(JSON.stringify({ error: "Invalid message format" }));
            return;
        }

        switch (data.type) {
            case 'status':
                userId = data.userId;
                connections[userId] = { socket: ws, online: true };
                UpdateUserOnlineStatus(db, userId, true);

                // Send confirmation to the user who just came online
                ws.send(JSON.stringify({
                    type: 'status',
                    status: 'online',
                    userId: userId
                }));

                // Broadcast to ALL OTHER connected users that this user is now online
                Object.keys(connections).forEach(connectedUserId => {
                    if (connectedUserId !== userId.toString() && connections[connectedUserId].online) {
                        const otherSocket = connections[connectedUserId].socket;
                        if (otherSocket && otherSocket.readyState === 1) { // WebSocket.OPEN = 1
                            otherSocket.send(JSON.stringify({
                                type: 'user_status_update',
                                userId: userId,
                                status: 'online'
                            }));
                        }
                    }
                });
                break;

            case 'testConnection':
                console.log('WebSocket connection established');
                ws.send(JSON.stringify({ type: 'testConnection', success: true }));
                break;

            case 'logout':
                console.log(`User ${userId} logging out`);
                // Clean up user connection and update status before closing
                if (userId && connections[userId]) {
                    connections[userId].online = false;
                    UpdateUserOnlineStatus(db, userId, false);

                    // Broadcast to ALL OTHER connected users that this user is now offline
                    Object.keys(connections).forEach(connectedUserId => {
                        if (connectedUserId !== userId.toString() && connections[connectedUserId].online) {
                            const otherSocket = connections[connectedUserId].socket;
                            if (otherSocket && otherSocket.readyState === 1) { // WebSocket.OPEN = 1
                                otherSocket.send(JSON.stringify({
                                    type: 'user_status_update',
                                    userId: userId,
                                    status: 'offline'
                                }));
                            }
                        }
                    });

                    delete connections[userId]; // Remove from connections object
                    console.log(`User ${userId} connection cleaned up`);
                }
                ws.close(1000, "Logout requested by user");
                break;

            default:
                ws.send(JSON.stringify({ error: "Unknown message type" }));
        }
    });

    ws.on('close', () => {
        if (userId && connections[userId]) {
            connections[userId].online = false;
            UpdateUserOnlineStatus(db, userId, false);

            // Broadcast to ALL OTHER connected users that this user is now offline
            Object.keys(connections).forEach(connectedUserId => {
                if (connectedUserId !== userId.toString() && connections[connectedUserId].online) {
                    const otherSocket = connections[connectedUserId].socket;
                    if (otherSocket && otherSocket.readyState === 1) { // WebSocket.OPEN = 1
                        otherSocket.send(JSON.stringify({
                            type: 'user_status_update',
                            userId: userId,
                            status: 'offline'
                        }));
                    }
                }
            });

            delete connections[userId]; // Remove from connections object
            console.log(`User ${userId} disconnected and cleaned up`);
        }
    });

    ws.on('error', (err) => {
        console.error("WebSocket error:", err);
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
