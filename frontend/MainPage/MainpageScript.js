class MessageMeChat {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.messages = {};
        this.isTyping = false;

        this.initializeApp();
        this.generateMockUsers();
        this.attachEventListeners();
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

    generateMockUsers() {
        this.users = [
            {
                id: 1,
                name: "Alice Johnson",
                avatar: "AJ",
                status: "online",
                lastMessage: "Hey! How are you doing?",
                lastMessageTime: "2 min ago",
                unreadCount: 3
            },
            {
                id: 2,
                name: "Bob Smith",
                avatar: "BS",
                status: "offline",
                lastMessage: "Thanks for the help!",
                lastMessageTime: "1 hour ago",
                unreadCount: 0
            },
            {
                id: 3,
                name: "Carol Davis",
                avatar: "CD",
                status: "online",
                lastMessage: "See you tomorrow 👋",
                lastMessageTime: "3 hours ago",
                unreadCount: 1
            },
            {
                id: 4,
                name: "David Wilson",
                avatar: "DW",
                status: "online",
                lastMessage: "That sounds great!",
                lastMessageTime: "1 day ago",
                unreadCount: 0
            },
            {
                id: 5,
                name: "Emma Brown",
                avatar: "EB",
                status: "offline",
                lastMessage: "Let's catch up soon",
                lastMessageTime: "2 days ago",
                unreadCount: 2
            },
            {
                id: 6,
                name: "Frank Miller",
                avatar: "FM",
                status: "online",
                lastMessage: "Perfect! 🎉",
                lastMessageTime: "1 week ago",
                unreadCount: 0
            }
        ];

        this.generateMockMessages();
        this.renderUsers();
    }

    generateMockMessages() {
        this.messages = {
            1: [
                { id: 1, text: "Hey! How are you doing?", sent: false, time: "10:30 AM" },
                { id: 2, text: "I'm doing great, thanks for asking!", sent: true, time: "10:32 AM" },
                { id: 3, text: "What about you?", sent: true, time: "10:32 AM" },
                { id: 4, text: "I'm good too! Just working on some projects", sent: false, time: "10:35 AM" },
                { id: 5, text: "That's awesome! What kind of projects?", sent: true, time: "10:36 AM" }
            ],
            2: [
                { id: 1, text: "Thanks for the help with the presentation!", sent: false, time: "9:15 AM" },
                { id: 2, text: "No problem! Happy to help", sent: true, time: "9:20 AM" },
                { id: 3, text: "It went really well", sent: false, time: "2:30 PM" }
            ],
            3: [
                { id: 1, text: "Are we still on for tomorrow?", sent: true, time: "8:00 AM" },
                { id: 2, text: "Yes! Looking forward to it", sent: false, time: "8:05 AM" },
                { id: 3, text: "See you tomorrow 👋", sent: false, time: "8:06 AM" }
            ]
        };
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

    selectUser(user) {
        this.currentUser = user;
        this.welcomeScreen.style.display = 'none';
        this.chatArea.style.display = 'flex';

        // Update chat header
        document.getElementById('chatUserAvatar').textContent = user.avatar;
        document.getElementById('chatUserName').textContent = user.name;
        document.getElementById('chatUserStatus').textContent = user.status === 'online' ? 'Online' : 'Last seen recently';

        // Clear unread count
        user.unreadCount = 0;

        // Render messages
        this.renderMessages();
        this.renderUsers();

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    }

    renderMessages() {
        if (!this.currentUser) return;

        const userMessages = this.messages[this.currentUser.id] || [];
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

    sendMessage() {
        if (!this.currentUser) return;

        const text = this.messageInput.value.trim();
        if (!text) return;

        const newMessage = {
            id: Date.now(),
            text: text,
            sent: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Add to messages
        if (!this.messages[this.currentUser.id]) {
            this.messages[this.currentUser.id] = [];
        }
        this.messages[this.currentUser.id].push(newMessage);

        // Update user's last message
        this.currentUser.lastMessage = text;
        this.currentUser.lastMessageTime = 'now';

        // Clear input
        this.messageInput.value = '';
        this.messageInput.style.height = '45px';

        // Re-render
        this.renderMessages();
        this.renderUsers();

        // Simulate typing and response
        this.simulateTyping();
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
