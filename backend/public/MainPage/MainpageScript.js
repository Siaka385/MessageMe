class MessageMeChat {
    constructor() {
        this.currentUser = null;
        this.selectedUser = null;
        this.users = [];
        this.messages = {};
        this.isTyping = false;
        this.typingTimeout = null;

        this.initializeApp();
        this.attachEventListeners();

    }

    async initializeApp() {
        // Initialize elements
        this.usersList = document.getElementById('usersList');
        this.chatArea = document.getElementById('chatArea');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.searchInput = document.getElementById('searchInput');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.logoutBtn = document.getElementById('logoutBtn');

        // Load current user info
        this.loadCurrentUser();

        // Load users first to ensure DOM elements exist
        await this.loadUsers();
        await this.loadConversations();

        // THEN send WebSocket status after user elements are rendered
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData && userData.id) {
            const { sendStatusWhenReady } = await import('../websocket.js');
            sendStatusWhenReady("status",userData.id);
        }

        // Set up WebSocket message handling
        this.setupWebSocketHandlers();
    }

    loadCurrentUser() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            const user = JSON.parse(userData);
            this.currentUser = user; // Set the current user property
            const avatarElement = document.getElementById('currentUserAvatar');
            const nameElement = document.getElementById('currentUserName');

            if (avatarElement && nameElement) {
                // Generate avatar initials from first letter of name
                const initials = user.name.charAt(0).toUpperCase();
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
            const response = await import('./MessageService.js').then(async({ messageService }) => {
                return await messageService.getConversations();
            });
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

            const response = await import('./MessageService.js').then(async({ messageService }) => {
                return await messageService.getMessages(userId);
            });
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
                await import('./MessageService.js').then(async({ messageService }) => {
                    await messageService.markAsRead(userId);;
                });


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
            userElement.className = "user-item";
            // Add active class if this is the selected user
            if (this.selectedUser && this.selectedUser.id === user.id) {
                userElement.className += " active";
            }
            userElement.id = `user-${user.id}`;
            userElement.onclick = () => {
                this.selectUser(user);
            };

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
        // Remove active class from all users first
        document.querySelectorAll('.user-item').forEach(item => {
            item.classList.remove('active');
        });

        this.selectedUser = user;
        this.welcomeScreen.style.display = 'none';
        this.chatArea.style.display = 'flex';

        // Update chat header
        document.getElementById('chatUserAvatar').textContent = user.avatar;
        document.getElementById('chatUserName').textContent = user.name;
        document.getElementById('chatUserStatus').textContent = user.status === 'online' ? 'Online' : 'Last seen recently';

        // Add active class to selected user
        const userElement = document.getElementById(`user-${user.id}`);
        if (userElement) {
            userElement.classList.add('active');
        }

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

            // Add pending indicator for sent messages that haven't been confirmed
            const pendingClass = message.pending ? ' pending' : '';
            messageElement.className += pendingClass;

            messageElement.innerHTML = `
                <div class="message-bubble">
                    <div class="message-text">${this.escapeHtml(message.text)}</div>
                    <div class="message-time">${message.time}${message.pending ? ' ⏳' : ''}</div>
                </div>
            `;

            this.chatMessages.appendChild(messageElement);
        });

        // Add typing indicator
        this.chatMessages.appendChild(this.typingIndicator);

        // Scroll to bottom smoothly
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 10);
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Set up WebSocket message handlers
    setupWebSocketHandlers() {
        
        window.chatApp = this;

      
        window.handleChatMessage = (message) => {
            this.handleIncomingMessage(message);
        };

        
        window.handleTypingStatus = (message, isTyping) => {
            this.handleTypingStatus(message, isTyping);
        };

      
        window.handleMessageSentConfirmation = (response) => {
            this.handleMessageSentConfirmation(response);
        };
    }

    // Handle message sent confirmation
    handleMessageSentConfirmation(response) {
        if (response.success && response.message) {
            const message = response.message;
            const receiverId = message.receiverId;

            // Find and update the pending message
            if (this.messages[receiverId]) {
                const messageIndex = this.messages[receiverId].findIndex(msg =>
                    msg.pending && msg.text === message.content
                );

                if (messageIndex !== -1) {
                    // Update the message with server data
                    this.messages[receiverId][messageIndex] = {
                        id: message.id,
                        text: message.content,
                        sent: true,
                        time: this.formatTime(message.timestamp),
                        timestamp: message.timestamp,
                        pending: false // Remove pending status
                    };

                    // Re-render if this is the current chat
                    if (this.selectedUser && this.selectedUser.id === receiverId) {
                        this.renderMessages();
                    }
                }
            }
        } else {
            console.error('Failed to send message:', response.error);
            // You could show an error message to the user here
        }
    }

    // Handle typing status from WebSocket
    handleTypingStatus(message, isTyping) {
        if (!this.currentUser || !this.selectedUser) return;

        // Only show typing indicator if it's from the currently selected user
        const isFromSelectedUser = message.senderId === this.selectedUser.id;

        if (isFromSelectedUser) {
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                if (isTyping) {
                    typingIndicator.style.display = 'block';
                    // Scroll to bottom to show typing indicator
                    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
                } else {
                    typingIndicator.style.display = 'none';
                }
            }
        }
    }

    // Handle incoming WebSocket messages
    handleIncomingMessage(message) {
        if (!this.currentUser) return;

        const isToCurrentUser = message.receiverId === this.currentUser.id;
        const isFromCurrentUser = message.senderId === this.currentUser.id;

        // Handle received messages (from other users to current user)
        if (isToCurrentUser && !isFromCurrentUser) {
            const senderId = message.senderId;

            // Add message to local cache
            if (!this.messages[senderId]) {
                this.messages[senderId] = [];
            }

            const newMessage = {
                id: message.id,
                text: message.content,
                sent: false,
                time: this.formatTime(message.timestamp),
                timestamp: message.timestamp
            };

            this.messages[senderId].push(newMessage);

            // Update user's last message in the list
            const userIndex = this.users.findIndex(u => u.id === senderId);
            if (userIndex !== -1) {
                this.users[userIndex].lastMessage = message.content;
                this.users[userIndex].lastMessageTime = 'now';

                // Increment unread count if not currently viewing this chat
                if (!this.selectedUser || this.selectedUser.id !== senderId) {
                    this.users[userIndex].unreadCount = (this.users[userIndex].unreadCount || 0) + 1;
                }
            }

            // Re-render messages if this is the currently selected chat
            if (this.selectedUser && this.selectedUser.id === senderId) {
                this.renderMessages();

                // Hide typing indicator when message is received
                const typingIndicator = document.getElementById('typingIndicator');
                if (typingIndicator) {
                    typingIndicator.style.display = 'none';
                }
            }

            // Always re-render user list to update last message and unread count
            this.renderUsers();

            // Play notification sound or show notification (optional)
            this.showMessageNotification(message);
        }
    }

    // Show message notification
    showMessageNotification(message) {
        // Only show notification if not currently viewing the chat
        if (!this.selectedUser || this.selectedUser.id !== message.senderId) {
            // You can add notification sound or browser notification here
            console.log(`New message from ${message.senderName}: ${message.content}`);
        }
    }

    // Typing indicator functionality
    handleTypingInput() {
        if (!this.selectedUser) return;

        const hasText = this.messageInput.value.trim().length > 0;

        if (hasText && !this.isTyping) {
            this.startTyping();
        } else if (!hasText && this.isTyping) {
            this.stopTyping();
        }
    }

    async startTyping() {
        if (!this.selectedUser || this.isTyping) return;

        this.isTyping = true;

        try {
            const { sendTypingIndicator } = await import("../websocket.js");
            sendTypingIndicator(this.selectedUser.id, true);

            // Auto-stop typing after 3 seconds of inactivity
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.stopTyping();
            }, 3000);

        } catch (error) {
            console.error('Error sending typing indicator:', error);
        }
    }

    async stopTyping() {
        if (!this.selectedUser || !this.isTyping) return;

        this.isTyping = false;
        clearTimeout(this.typingTimeout);

        try {
            const { sendTypingIndicator } = await import("../websocket.js");
            sendTypingIndicator(this.selectedUser.id, false);
        } catch (error) {
            console.error('Error stopping typing indicator:', error);
        }
    }

    async sendMessage() {
        if (!this.selectedUser) return;

        const text = this.messageInput.value.trim();
        if (!text) return;

        // Clear input immediately for better UX
        this.messageInput.value = '';
        this.messageInput.style.height = '45px';

        try {
            // Send message via WebSocket
            const { sendChatMessage } = await import("../websocket.js");
            const success = sendChatMessage(this.selectedUser.id, text, 'text');

            if (success) {
                // Add message to local cache immediately for better UX
                if (!this.messages[this.selectedUser.id]) {
                    this.messages[this.selectedUser.id] = [];
                }

                const newMessage = {
                    id: Date.now(), // Temporary ID until server confirms
                    text: text,
                    sent: true,
                    time: this.formatTime(new Date().toISOString()),
                    timestamp: new Date().toISOString(),
                    pending: true // Mark as pending until server confirms
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

                // Stop typing indicator since message was sent
                this.stopTyping();

            } else {
                console.error('Failed to send message via WebSocket');
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

        // Message input auto-resize and typing indicators
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = '45px';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';

            // Handle typing indicators
            this.handleTypingInput();
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

        // Stop typing when input loses focus
        this.messageInput.addEventListener('blur', () => {
            this.stopTyping();
        });

        // Logout button click
        this.logoutBtn.addEventListener('click', logout);

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
async function logout() {

    if (confirm('Are you sure you want to logout?')) {

        const {logoutUser}=await import("../websocket.js")
        logoutUser()
        
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



const parent = document.querySelector('.ted');

