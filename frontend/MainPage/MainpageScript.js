

class MessageMeChat {
    constructor() {
        this.currentUser = null;
        this.selectedUser = null;
        this.users = [];
        this.messages = {};
        this.isTyping = false;
        this.typingTimeout = null;

        this.initializeApp();
        this.loadUsers();
        this.loadConversations();
        this.attachEventListeners();

        // Initialize mock data for testing
        import('./MessageService.js').then(({ messageService }) => {
            messageService.initializeMockData();
        });
    }

    initializeApp() {
        // Initialize elements
        this.usersList = document.getElementById('usersList');
        this.chatArea = document.getElementById('chatArea');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.searchInput = document.getElementById('searchInput');
        this.typingIndicator = document.getElementById('typingIndicator');

        // Load current user info
        this.loadCurrentUser();
    }

    loadCurrentUser() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            const user = JSON.parse(userData);
            const avatarElement = document.getElementById('currentUserAvatar');
            const nameElement = document.getElementById('currentUserName');

            if (avatarElement && nameElement) {
                // Generate avatar initials
                const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                avatarElement.textContent = initials;
                nameElement.textContent = user.name;
            }
        }
    }

    async loadUsers() {
        try {
            const response = await import('./MessageService.js').then(async({ messageService }) => {
                return await messageService.getUsers();
            });
            if (response.success) {
                this.users = response.data.map(user => ({
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                    status: user.isOnline ? 'online' : 'offline',
                    lastMessage: '',
                    lastMessageTime: '',
                    unreadCount: 0
                }));
                this.renderUsers();
            } else {
                console.error('Failed to load users:', response.message);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async loadConversations() {
        try {
            const response = await messageService.getConversations();
            if (response.success) {
                // Update users with conversation data
                response.data.forEach(conversation => {
                    const userIndex = this.users.findIndex(u => u.id === conversation.userId);
                    if (userIndex !== -1) {
                        this.users[userIndex].lastMessage = conversation.lastMessage;
                        this.users[userIndex].lastMessageTime = this.formatTime(conversation.lastMessageTime);
                        this.users[userIndex].unreadCount = conversation.unreadCount;
                        this.users[userIndex].status = conversation.isOnline ? 'online' : 'offline';
                    }
                });
                this.renderUsers();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    async loadMessages(userId) {
        try {
            const response = await messageService.getMessages(userId);
            if (response.success) {
                const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
                const currentUserId = currentUser.id || 0;

                this.messages[userId] = response.data.messages.map(msg => ({
                    id: msg.id,
                    text: msg.message,
                    sent: msg.senderId === currentUserId,
                    time: this.formatTime(msg.timestamp),
                    timestamp: msg.timestamp
                }));

                this.renderMessages();

                // Mark messages as read
                await messageService.markAsRead(userId);

                // Update unread count in user list
                const userIndex = this.users.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.users[userIndex].unreadCount = 0;
                    this.renderUsers();
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderUsers() {
        const filteredUsers = this.users.filter(user =>
            user.name.toLowerCase().includes(this.searchInput.value.toLowerCase())
        );

        this.usersList.innerHTML = '';

        filteredUsers.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = `user-item ${this.currentUser?.id === user.id ? 'active' : ''}`;
            userElement.onclick = () => this.selectUser(user);

            userElement.innerHTML = `
                <div class="user-item-avatar">
                    ${user.avatar}
                    <div class="online-indicator ${user.status === 'offline' ? 'offline-indicator' : ''}"></div>
                </div>
                <div class="user-item-info">
                    <div class="user-item-name">${user.name}</div>
                    <div class="last-message">${user.lastMessage}</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                    <div class="message-time">${user.lastMessageTime}</div>
                    ${user.unreadCount > 0 ? `<div class="unread-count">${user.unreadCount}</div>` : ''}
                </div>
            `;

            this.usersList.appendChild(userElement);
        });
    }

    async selectUser(user) {
        this.selectedUser = user;
        this.welcomeScreen.style.display = 'none';
        this.chatArea.style.display = 'flex';

        // Update chat header
        document.getElementById('chatUserAvatar').textContent = user.avatar;
        document.getElementById('chatUserName').textContent = user.name;
        document.getElementById('chatUserStatus').textContent = user.status === 'online' ? 'Online' : 'Last seen recently';

        // Load messages for this user
        await this.loadMessages(user.id);

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    }

    renderMessages() {
        if (!this.selectedUser) return;

        const userMessages = this.messages[this.selectedUser.id] || [];
        this.chatMessages.innerHTML = '';

        userMessages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.sent ? 'sent' : 'received'}`;

            messageElement.innerHTML = `
                <div class="message-bubble">
                    <div class="message-text">${message.text}</div>
                    <div class="message-time">${message.time}</div>
                </div>
            `;

            this.chatMessages.appendChild(messageElement);
        });

        // Add typing indicator
        this.chatMessages.appendChild(this.typingIndicator);

        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    async sendMessage() {
        if (!this.selectedUser) return;

        const text = this.messageInput.value.trim();
        if (!text) return;

        // Clear input immediately for better UX
        this.messageInput.value = '';
        this.messageInput.style.height = '45px';

        try {
            const response = await messageService.sendMessage(this.selectedUser.id, text, 'text');

            if (response.success) {
                // Add message to local cache
                if (!this.messages[this.selectedUser.id]) {
                    this.messages[this.selectedUser.id] = [];
                }

                const newMessage = {
                    id: response.data.id,
                    text: text,
                    sent: true,
                    time: this.formatTime(response.data.timestamp),
                    timestamp: response.data.timestamp
                };

                this.messages[this.selectedUser.id].push(newMessage);

                // Update user's last message in the list
                const userIndex = this.users.findIndex(u => u.id === this.selectedUser.id);
                if (userIndex !== -1) {
                    this.users[userIndex].lastMessage = text;
                    this.users[userIndex].lastMessageTime = 'now';
                }

                // Re-render
                this.renderMessages();
                this.renderUsers();

            } else {
                console.error('Failed to send message:', response.message);
                // Restore the message in input if sending failed
                this.messageInput.value = text;
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Restore the message in input if sending failed
            this.messageInput.value = text;
        }
    }

    simulateTyping() {
        if (!this.currentUser) return;

        // Show typing indicator
        this.typingIndicator.style.display = 'block';
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        // Simulate response after 2-3 seconds
        setTimeout(() => {
            this.typingIndicator.style.display = 'none';

            const responses = [
                "That's interesting! 🤔",
                "I totally agree with you",
                "Thanks for sharing that!",
                "Haha, that's funny! 😄",
                "Really? Tell me more!",
                "I see what you mean",
                "That sounds great!",
                "Absolutely! 👍"
            ];

            const randomResponse = responses[Math.floor(Math.random() * responses.length)];

            const responseMessage = {
                id: Date.now(),
                text: randomResponse,
                sent: false,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            this.messages[this.currentUser.id].push(responseMessage);
            this.currentUser.lastMessage = randomResponse;
            this.currentUser.lastMessageTime = 'now';

            this.renderMessages();
            this.renderUsers();
        }, Math.random() * 2000 + 1000);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) {
            return 'now';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes} min ago`;
        } else if (diffInMinutes < 1440) { // 24 hours
            const hours = Math.floor(diffInMinutes / 60);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInMinutes < 10080) { // 7 days
            const days = Math.floor(diffInMinutes / 1440);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    attachEventListeners() {
        // Search functionality
        this.searchInput.addEventListener('input', () => {
            this.renderUsers();
        });

        // Message input auto-resize
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = '45px';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });

        // Send message on Enter
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Update send button state
        this.messageInput.addEventListener('input', () => {
            this.sendBtn.disabled = !this.messageInput.value.trim();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    }
}

// Initialize the chat application
const chatApp = new MessageMeChat();

// Utility functions
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session data
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');

        // Reload page to show login
        window.location.reload();
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Simulate random online status changes
setInterval(() => {
    chatApp.users.forEach(user => {
        if (Math.random() < 0.1) { // 10% chance to change status
            user.status = user.status === 'online' ? 'offline' : 'online';
        }
    });
    chatApp.renderUsers();
}, 30000); // Every 30 seconds
