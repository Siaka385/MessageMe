export function MainPageComponet() {

    return `
        <div class="chat-container">
        <!-- Sidebar -->
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="user-info">
                    <div class="user-avatar" id="currentUserAvatar">AD</div>
                    <div class="user-name" id="currentUserName">Admin User</div>
                </div>
                <button class="logout-btn" id="logoutBtn">Logout</button>
            </div>

            <div class="search-container">
                <div class="search-box">
                    <span class="search-icon">🔍</span>
                    <input type="text" class="search-input" placeholder="Search users..." id="searchInput">
                </div>
            </div>

            <div class="users-list" id="usersList">
                <!-- Users will be populated here -->
            </div>
        </div>

        <!-- Main Chat Area -->
        <div class="main-chat" id="mainChat">
            <div class="welcome-screen" id="welcomeScreen">
                <div class="welcome-icon">💬</div>
                <h2>Welcome to MessageMe</h2>
                <p>Select a user from the sidebar to start chatting. Connect with friends and share your thoughts instantly!</p>
            </div>

            <div class="chat-area" id="chatArea" style="display: none;">
                <div class="chat-header">
                    <button class="mobile-menu-btn" onclick="toggleSidebar()">☰</button>
                    <div class="chat-user-avatar" id="chatUserAvatar">A</div>
                    <div class="chat-user-info">
                        <h3 id="chatUserName">User Name</h3>
                        <p id="chatUserStatus">Online</p>
                    </div>
                </div>

                <div class="chat-messages" id="chatMessages">
                    <div class="typing-indicator" id="typingIndicator">
                        <div class="typing-dots">
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                            <span style="margin-left: 8px; font-size: 12px; color: #667eea;">typing...</span>
                        </div>
                    </div>
                </div>

                <div class="message-input-container">
                    <textarea class="message-input" id="messageInput" placeholder="Type a message..." rows="1"></textarea>
                    <button class="send-btn" id="sendBtn">➤</button>
                </div>
            </div>
        </div>
    </div>

    `

}