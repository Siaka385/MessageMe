// Message Service for handling chat functionality
class MessageService {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.headers = {
            'Content-Type': 'application/json',
        };
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

}

// Export singleton instance
export const messageService = new MessageService();
