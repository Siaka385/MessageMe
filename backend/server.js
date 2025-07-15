import express from "express";
import cors from "cors";
import { initDb, InitiliazeDbTables, UpdateUserOnlineStatus, addMessage, getMessageById, getUserById } from "./database.js";
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

            case 'chat':
                // Handle real-time message sending
                if (data.receiverId && data.content && userId) {
                    try {
                        // Add message to database
                        const result = addMessage(db, userId, data.receiverId, data.content.trim(), data.messageType || 'text');
                        const newMessage = getMessageById(db, result.lastInsertRowid);
                        const sender = getUserById(db, userId);
                        const receiver = getUserById(db, data.receiverId);

                        // Prepare message for broadcasting
                        const messageData = {
                            type: 'chat',
                            id: newMessage.id,
                            senderId: newMessage.sender_id,
                            receiverId: newMessage.receiver_id,
                            senderName: sender.username,
                            receiverName: receiver.username,
                            content: newMessage.message,
                            messageType: newMessage.message_type,
                            timestamp: newMessage.created_at,
                            isRead: newMessage.is_read
                        };

                        // Send to receiver if they're online
                        if (connections[data.receiverId] && connections[data.receiverId].online) {
                            const receiverSocket = connections[data.receiverId].socket;
                            if (receiverSocket && receiverSocket.readyState === 1) {
                                receiverSocket.send(JSON.stringify(messageData));
                            }
                        }

                        // Send confirmation back to sender
                        ws.send(JSON.stringify({
                            type: 'message_sent',
                            success: true,
                            message: messageData
                        }));

                    } catch (error) {
                        console.error('Error handling chat message:', error);
                        ws.send(JSON.stringify({
                            type: 'message_sent',
                            success: false,
                            error: 'Failed to send message'
                        }));
                    }
                }
                break;

            case 'typing':
                // Handle typing indicator
                if (data.receiverId && userId) {
                    // Send typing indicator to receiver if they're online
                    if (connections[data.receiverId] && connections[data.receiverId].online) {
                        const receiverSocket = connections[data.receiverId].socket;
                        if (receiverSocket && receiverSocket.readyState === 1) {
                            receiverSocket.send(JSON.stringify({
                                type: 'typing',
                                senderId: userId,
                                senderName: data.senderName || 'User'
                            }));
                        }
                    }
                }
                break;

            case 'typing_stopped':
                // Handle typing stopped
                if (data.receiverId && userId) {
                    // Send typing stopped to receiver if they're online
                    if (connections[data.receiverId] && connections[data.receiverId].online) {
                        const receiverSocket = connections[data.receiverId].socket;
                        if (receiverSocket && receiverSocket.readyState === 1) {
                            receiverSocket.send(JSON.stringify({
                                type: 'typing_stopped',
                                senderId: userId,
                                senderName: data.senderName || 'User'
                            }));
                        }
                    }
                }
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
