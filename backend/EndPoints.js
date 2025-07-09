import express from "express";
import bcrypt from "bcrypt";
import {AddUserToTable, getUserByEmail, getUserByUsername, getUserById, getAllUsers, addMessage, getMessagesBetweenUsers, getConversationsForUser, markMessagesAsRead, getMessageById } from "./database.js";

import { generateToken, authenticateToken } from "./jwtAuth.js";

export function CallEndpoint(app,db){
    
// User Registration Endpoint
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }
        // Check if user already exists
        const existingUserByEmail = getUserByEmail(db, email);
        if (existingUserByEmail) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists'
            });
        }

        const existingUserByUsername = getUserByUsername(db, name);
        if (existingUserByUsername) {
            return res.status(409).json({
                success: false,
                message: 'This username is already taken'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert user into database
        AddUserToTable(db, email, name, hashedPassword);

        // Get the created user
        const newUser = getUserByEmail(db, email);

        console.log('User created successfully:', { id: newUser.id, username: name, email });

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            data: {
                user: {
                    id: newUser.id,
                    name: newUser.username,
                    email: newUser.email
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
});

// User Login Endpoint
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }


        // Check if user exists in database
        const user = getUserByEmail(db, email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = generateToken({ userId: user.id });

        console.log('User logged in successfully:', { id: user.id, email: user.email });

        // Return success response
        res.json({
            success: true,
            message: 'Login successful!',
            token: token,
            user: {
                id: user.id,
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
});


// Token verification endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    try {
        const user = getUserById(db, req.user.userId);
        if (!user && req.user.userId !== 0) { // Allow admin user (id: 0)
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: req.user.userId === 0 ? {
                id: 0,
                name: 'Admin User',
                email: 'admin',
                role: 'admin'
            } : {
                id: user.id,
                name: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Logout endpoint
app.post('/api/auth/signout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Get all users endpoint (protected)
app.get('/api/users', authenticateToken, (req, res) => {
    try {
        const users = getAllUsers(db);
        res.json({
            success: true,
            data: users.map(user => ({
                id: user.id,
                name: user.username,
                email: user.email,
                avatar: user.username.split(' ').map(n => n[0]).join('').toUpperCase(),
                isOnline: Math.random() > 0.5, // Random online status for demo
                created_at: user.created_at
            }))
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Send message endpoint
app.post('/api/messages/send', authenticateToken, (req, res) => {
    try {
        const { receiverId, message, messageType = 'text' } = req.body;
        const senderId = req.user.userId;

        // Validation
        if (!receiverId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Receiver ID and message are required'
            });
        }

        if (message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        // Check if receiver exists 
        if (receiverId !== 0) {
            const receiver = getUserById(db, receiverId);
            if (!receiver) {
                return res.status(404).json({
                    success: false,
                    message: 'Receiver not found'
                });
            }
        }

        // Add message to database
        const result = addMessage(db, senderId, receiverId, message.trim(), messageType);

        // Get the created message
        const newMessage = getMessageById(db, result.lastInsertRowid);

        console.log('Message sent:', { id: result.lastInsertRowid, from: senderId, to: receiverId });

        res.status(201).json({
            success: true,
            data: {
                id: newMessage.id,
                senderId: newMessage.sender_id,
                receiverId: newMessage.receiver_id,
                message: newMessage.message,
                messageType: newMessage.message_type,
                timestamp: newMessage.created_at,
                isRead: newMessage.is_read
            },
            message: 'Message sent successfully'
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get messages between users endpoint
app.get('/api/messages/:userId', authenticateToken, (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.userId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        // Validation
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Get messages between current user and specified user
        const messages = getMessagesBetweenUsers(db, currentUserId, parseInt(userId), limit, offset);

        // Count total messages for pagination
        const totalMessages = getMessagesBetweenUsers(db, currentUserId, parseInt(userId), 999999, 0).length;

        res.json({
            success: true,
            data: {
                messages: messages.map(msg => ({
                    id: msg.id,
                    senderId: msg.sender_id,
                    receiverId: msg.receiver_id,
                    message: msg.message,
                    messageType: msg.message_type,
                    timestamp: msg.created_at,
                    isRead: msg.is_read,
                    senderName: msg.sender_name,
                    receiverName: msg.receiver_name
                })),
                total: totalMessages,
                hasMore: offset + limit < totalMessages
            }
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get conversations endpoint
app.get('/api/conversations', authenticateToken, (req, res) => {
    try {
        const currentUserId = req.user.userId;

        // Get conversations for current user
        const conversations = getConversationsForUser(db, currentUserId);

        res.json({
            success: true,
            data: conversations.map(conv => ({
                userId: conv.other_user_id,
                userName: conv.other_user_name,
                userAvatar: conv.other_user_name.split(' ').map(n => n[0]).join('').toUpperCase(),
                lastMessage: conv.last_message,
                lastMessageTime: conv.last_message_time,
                unreadCount: conv.unread_count,
                isOnline: Math.random() > 0.5 // Random online status for demo
            }))
        });

    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Mark messages as read endpoint
app.put('/api/messages/read/:userId', authenticateToken, (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.userId;

        // Validation
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Mark messages from userId to currentUser as read
        const result = markMessagesAsRead(db, parseInt(userId), currentUserId);

        console.log('Messages marked as read:', { from: userId, to: currentUserId, count: result.changes });

        res.json({
            success: true,
            message: `${result.changes} messages marked as read`
        });

    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

}


// Helper function to hash passwords
async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}