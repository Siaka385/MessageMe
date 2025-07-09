// Message Service for handling chat functionality
class MessageService {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.headers = {
            'Content-Type': 'application/json',
        };
        this.useMockAPI = false; // Set to true for testing without backend
    }

    // Get authorization headers with JWT token
    getAuthHeaders() {
        const token = localStorage.getItem('userToken');
        return {
            ...this.headers,
            'Authorization': `Bearer ${token}`
        };
    }

    // Send a message
    async sendMessage(receiverId, message, messageType = 'text') {
        if (this.useMockAPI) {
            return this.mockSendMessage(receiverId, message, messageType);
        }

        try {
            const response = await fetch(`${this.baseURL}/messages/send`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    receiverId: receiverId,
                    message: message,
                    messageType: messageType
                })
            });

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Send message error:', error);
            return {
                success: false,
                message: 'Failed to send message'
            };
        }
    }

    // Get messages between current user and another user
    async getMessages(userId, limit = 50, offset = 0) {
        if (this.useMockAPI) {
            return this.mockGetMessages(userId, limit, offset);
        }

        try {
            const response = await fetch(`${this.baseURL}/messages/${userId}?limit=${limit}&offset=${offset}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Get messages error:', error);
            return {
                success: false,
                message: 'Failed to load messages'
            };
        }
    }

    // Get all conversations for current user
    async getConversations() {
        if (this.useMockAPI) {
            return this.mockGetConversations();
        }

        try {
            const response = await fetch(`${this.baseURL}/conversations`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Get conversations error:', error);
            return {
                success: false,
                message: 'Failed to load conversations'
            };
        }
    }

    // Get all users for chat
    async getUsers() {
        if (this.useMockAPI) {
            return this.mockGetUsers();
        }

        try {
            const response = await fetch(`${this.baseURL}/users`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Get users error:', error);
            return {
                success: false,
                message: 'Failed to load users'
            };
        }
    }

    // Mark messages as read
    async markAsRead(userId) {
        if (this.useMockAPI) {
            return this.mockMarkAsRead(userId);
        }

        try {
            const response = await fetch(`${this.baseURL}/messages/read/${userId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Mark as read error:', error);
            return {
                success: false,
                message: 'Failed to mark messages as read'
            };
        }
    }

    // Mock API methods for testing
    async mockSendMessage(receiverId, message, messageType) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const newMessage = {
            id: Date.now(),
            senderId: currentUser.id || 0,
            receiverId: receiverId,
            message: message,
            messageType: messageType,
            timestamp: new Date().toISOString(),
            isRead: false
        };

        // Store in localStorage for persistence
        const messages = JSON.parse(localStorage.getItem('mockMessages') || '[]');
        messages.push(newMessage);
        localStorage.setItem('mockMessages', JSON.stringify(messages));

        return {
            success: true,
            data: newMessage,
            message: 'Message sent successfully'
        };
    }

    async mockGetMessages(userId, limit, offset) {
        await new Promise(resolve => setTimeout(resolve, 300));

        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const currentUserId = currentUser.id || 0;

        const allMessages = JSON.parse(localStorage.getItem('mockMessages') || '[]');

        // Filter messages between current user and specified user
        const conversation = allMessages.filter(msg =>
            (msg.senderId === currentUserId && msg.receiverId === userId) ||
            (msg.senderId === userId && msg.receiverId === currentUserId)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Apply pagination
        const paginatedMessages = conversation.slice(offset, offset + limit);

        return {
            success: true,
            data: {
                messages: paginatedMessages,
                total: conversation.length,
                hasMore: offset + limit < conversation.length
            }
        };
    }

    async mockGetConversations() {
        await new Promise(resolve => setTimeout(resolve, 400));

        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const currentUserId = currentUser.id || 0;

        const allMessages = JSON.parse(localStorage.getItem('mockMessages') || '[]');
        const users = this.getMockUsers();

        // Group messages by conversation
        const conversations = {};

        allMessages.forEach(msg => {
            const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;

            if (!conversations[otherUserId]) {
                const otherUser = users.find(u => u.id === otherUserId);
                conversations[otherUserId] = {
                    userId: otherUserId,
                    userName: otherUser ? otherUser.name : 'Unknown User',
                    userAvatar: otherUser ? otherUser.avatar : 'UN',
                    lastMessage: msg.message,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0,
                    isOnline: otherUser ? otherUser.isOnline : false
                };
            } else {
                // Update with latest message
                if (new Date(msg.timestamp) > new Date(conversations[otherUserId].lastMessageTime)) {
                    conversations[otherUserId].lastMessage = msg.message;
                    conversations[otherUserId].lastMessageTime = msg.timestamp;
                }
            }

            // Count unread messages
            if (msg.receiverId === currentUserId && !msg.isRead) {
                conversations[otherUserId].unreadCount++;
            }
        });

        return {
            success: true,
            data: Object.values(conversations).sort((a, b) =>
                new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
            )
        };
    }

    async mockGetUsers() {
        await new Promise(resolve => setTimeout(resolve, 200));

        const users = this.getMockUsers();
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');

        // Filter out current user
        const otherUsers = users.filter(user => user.id !== (currentUser.id || 0));

        return {
            success: true,
            data: otherUsers
        };
    }

    async mockMarkAsRead(userId) {
        await new Promise(resolve => setTimeout(resolve, 100));

        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const currentUserId = currentUser.id || 0;

        const allMessages = JSON.parse(localStorage.getItem('mockMessages') || '[]');

        // Mark messages from userId to currentUser as read
        const updatedMessages = allMessages.map(msg => {
            if (msg.senderId === userId && msg.receiverId === currentUserId) {
                return { ...msg, isRead: true };
            }
            return msg;
        });

        localStorage.setItem('mockMessages', JSON.stringify(updatedMessages));

        return {
            success: true,
            message: 'Messages marked as read'
        };
    }

    // Get mock users for testing
    getMockUsers() {
        return [
            {
                id: 1,
                name: 'Alice Johnson',
                email: 'alice@example.com',
                avatar: 'AJ',
                isOnline: true,
                lastSeen: new Date().toISOString()
            },
            {
                id: 2,
                name: 'Bob Smith',
                email: 'bob@example.com',
                avatar: 'BS',
                isOnline: false,
                lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
            },
            {
                id: 3,
                name: 'Carol Davis',
                email: 'carol@example.com',
                avatar: 'CD',
                isOnline: true,
                lastSeen: new Date().toISOString()
            },
            {
                id: 4,
                name: 'David Wilson',
                email: 'david@example.com',
                avatar: 'DW',
                isOnline: false,
                lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
            },
            {
                id: 5,
                name: 'Emma Brown',
                email: 'emma@example.com',
                avatar: 'EB',
                isOnline: true,
                lastSeen: new Date().toISOString()
            }
        ];
    }

    // Initialize mock data for testing
    initializeMockData() {
        const existingMessages = localStorage.getItem('mockMessages');
        if (!existingMessages) {
            const mockMessages = [
                {
                    id: 1,
                    senderId: 1,
                    receiverId: 0, // Admin user
                    message: 'Hello Admin! How are you today?',
                    messageType: 'text',
                    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
                    isRead: false
                },
                {
                    id: 2,
                    senderId: 0, // Admin user
                    receiverId: 1,
                    message: 'Hi Alice! I\'m doing great, thanks for asking.',
                    messageType: 'text',
                    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(), // 55 minutes ago
                    isRead: true
                },
                {
                    id: 3,
                    senderId: 2,
                    receiverId: 0, // Admin user
                    message: 'Hey, can you help me with something?',
                    messageType: 'text',
                    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
                    isRead: false
                }
            ];
            localStorage.setItem('mockMessages', JSON.stringify(mockMessages));
        }
    }
}

// Export singleton instance
export const messageService = new MessageService();
