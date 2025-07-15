// WebSocket connection
export let socket = null;
let reconnectInterval = null;
const reconnectDelay = 5000; // 5 seconds

// Connect to WebSocket server
function connectWebSocket() {
    // Close existing socket if it exists
    if (socket) {
        socket.close();
    }

    const wsUrl = 'ws://localhost:3000';

    socket = new WebSocket(wsUrl);

    // WebSocket event handlers
    socket.onopen = function() {
        console.log('WebSocket connection established');

        // Clear reconnect interval if it exists
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

        // Send test message
        socket.send(JSON.stringify({ type: 'testConnection' }));
    };

    socket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };

    socket.onclose = function(event) {
        console.log('WebSocket connection closed', event);
        // Attempt to reconnect
        // if (!reconnectInterval) {
        //     reconnectInterval = setInterval(connectWebSocket, reconnectDelay);
        // }
    };

    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

//Handle incoming WebSocket messages
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'chat':
            // Handle chat message
            handleChatMessage(message);
            // Update notification badge if not in the current chat
            updateNotificationBadge();
            break;
        case 'message_sent':
            // Handle message sent confirmation
            handleMessageSentConfirmation(message);
            break;
        case 'status':
            console.log("Status confirmation received for current user")
            // This is just a confirmation that our own status was set
            // We don't need to update UI since we don't show ourselves in the user list
            break;
        case 'user_status_update':
            console.log("Other user status update received:", message)
            // Handle status update for OTHER users
            handleStatusUpdate(message);
            break;
        case 'typing':
            // Handle typing indicator
            handleTypingStatus(message, true);
            break;
        case 'typing_stopped':
            // Handle typing stopped
            handleTypingStatus(message, false);
            break;
        case 'testConnection':
            console.log("connection test passed")
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

// Handle chat messages
function handleChatMessage(message) {
    // Check if there's a global chat app instance to handle the message
    if (window.chatApp && typeof window.chatApp.handleIncomingMessage === 'function') {
        window.chatApp.handleIncomingMessage(message);
        return;
    }

    // Fallback to basic handling if no chat app instance
    console.log('Received chat message:', message);

    // Check if we're in the main page chat interface
    const chatMessages = document.getElementById('chatMessages');
    const currentUser = JSON.parse(localStorage.getItem('userData'));

    if (!chatMessages || !currentUser) {
        console.log('Chat interface not available or user not logged in');
        return;
    }

    // Get the currently selected user from the chat interface
    const chatUserName = document.getElementById('chatUserName');
    const currentChatUser = chatUserName ? chatUserName.textContent : null;

    // Only display message if it's from/to the currently active chat
    const isFromCurrentChat = message.senderName === currentChatUser;
    const isToCurrentChat = message.receiverName === currentChatUser;
    const isFromCurrentUser = message.senderId === currentUser.id;
    const isToCurrentUser = message.receiverId === currentUser.id;

    if ((isFromCurrentChat && isToCurrentUser) || (isToCurrentChat && isFromCurrentUser)) {
        // Create message element
        const messageElement = createMessageElement(message, currentUser.id);

        // Remove typing indicator if it exists
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }

        // Add message to chat
        chatMessages.appendChild(messageElement);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Mark message as read if it's received
        if (message.senderId !== currentUser.id) {
            // You can implement mark as read functionality here
            console.log('Message received from:', message.senderName);
        }
    }

    // Update user list with last message (if applicable)
    updateUserListLastMessage(message);
}

// Create message element for display
function createMessageElement(message, currentUserId) {
    const messageDiv = document.createElement('div');
    const isSent = message.senderId === currentUserId;

    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

    const messageTime = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${escapeHtml(message.content)}</p>
        </div>
        <div class="message-time">${messageTime}</div>
    `;

    return messageDiv;
}

// Handle message sent confirmation
function handleMessageSentConfirmation(response) {
    if (response.success) {
        console.log('Message sent successfully:', response.message);
        // The message will be displayed when it comes back through the chat handler
    } else {
        console.error('Failed to send message:', response.error);
        // You could show an error message to the user here
        alert('Failed to send message: ' + response.error);
    }
}

// Update user list with last message
function updateUserListLastMessage(message) {
    // This function would update the user list sidebar with the latest message
    // Implementation depends on your user list structure
    console.log('Updating user list with last message:', message.content);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle status updates for OTHER users (not current user)
function handleStatusUpdate(message) {
    
    // Find user in the list (this should be another user, not current user)
    const userElement = document.querySelector(`#user-${message.userId}`);
    console.log('User element found:', userElement);

    if (userElement) {
        const statusBadge = userElement.querySelector('.online-indicator');

        // Update status badge
        if (statusBadge) {
            statusBadge.className = `online-indicator ${message.status === 'offline' ? 'offline-indicator' : ''}`;
            console.log(`✅ Updated status for user ${message.userId} to: ${message.status}`);
        } else {
            console.warn('Status badge not found for user:', message.userId);
        }
    } else {
        console.warn(`User element #user-${message.userId} not found in DOM. This user might not be in the current user's contact list.`);
    }
}



// Send message via WebSocket with retry mechanism
function sendWebSocketMessage(Messagetype, userID, receiverName, content, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    if (!socket) {
        console.error('WebSocket not initialized. Reconnecting...');
        connectWebSocket();

        if (retryCount < maxRetries) {
            setTimeout(() => {
                sendWebSocketMessage(Messagetype, userID, receiverName, content, retryCount + 1);
            }, retryDelay);
        }
        return false;
    }

    if (socket.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket is connecting, waiting...');
        if (retryCount < maxRetries) {
            setTimeout(() => {
                sendWebSocketMessage(Messagetype, userID, receiverName, content, retryCount + 1);
            }, retryDelay);
        }
        return false;
    }

    if (socket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket not connected. Current state:',
            socket.readyState === WebSocket.CLOSING ? 'CLOSING' : 'CLOSED');

        if (retryCount < maxRetries) {
            console.log(`Retrying connection... (${retryCount + 1}/${maxRetries})`);
            connectWebSocket();
            setTimeout(() => {
                sendWebSocketMessage(Messagetype, userID, receiverName, content, retryCount + 1);
            }, retryDelay);
        }
        return false;
    }

    const message = {
        type: Messagetype,
        content: content,
        userId: userID,
        receiver_name: receiverName
    };

    try {
        socket.send(JSON.stringify(message));
        console.log(`WebSocket message sent: ${Messagetype}`);
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
}


//handle user logout
function logoutUser() {
    console.log('Logging out user...');

    // Inform the server about logout
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(JSON.stringify({ type: "logout" }));
            console.log('Logout message sent to server');
        } catch (error) {
            console.error('Error sending logout message:', error);
        }

        // Close the connection after a brief delay to ensure message is sent
        setTimeout(() => {
            if (socket) {
                socket.close(1000, "User logged out");
                socket = null; // Clear the socket reference
                console.log('WebSocket connection closed');
            }
        }, 100);
    } else {
        // If socket is not open, just clear the reference
        socket = null;
        console.log('WebSocket was not connected, cleared reference');
    }

    // Clear any reconnect intervals
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
        console.log('Reconnect interval cleared');
    }
}

// Handle typing status
function handleTypingStatus(message, isTyping) {
    const currentUser = JSON.parse(localStorage.getItem('userData'));
    const chatUserName = document.getElementById('chatUserName');
    const typingIndicator = document.getElementById('typingIndicator');

    if (!currentUser || !chatUserName || !typingIndicator) {
        return;
    }

    // Only show typing indicator if it's from the current chat user
    const currentChatUser = chatUserName.textContent;
    const isFromCurrentChatUser = message.senderName === currentChatUser;

    if (isFromCurrentChatUser) {
        if (isTyping) {
            // Show typing indicator
            typingIndicator.style.display = 'block';

            // Scroll to bottom to show typing indicator
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } else {
            // Hide typing indicator
            typingIndicator.style.display = 'none';
        }
    }
}


// Wait for WebSocket connection to be ready
function waitForConnection(callback, maxWait = 5000) {
    const startTime = Date.now();

    function checkConnection() {
        if (socket && socket.readyState === WebSocket.OPEN) {
            callback();
        } else if (Date.now() - startTime < maxWait) {
            setTimeout(checkConnection, 100);
        } else {
            console.error('WebSocket connection timeout');
        }
    }

    checkConnection();
}

// Send status message when connection is ready
function sendStatusWhenReady(type,userId,receiverName="",content="") {
    waitForConnection(() => {
        sendWebSocketMessage(type, userId, receiverName, content);
    });
}

// Send chat message via WebSocket
function sendChatMessage(receiverId, content, messageType = 'text') {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        console.error('No current user found');
        return false;
    }

    const message = {
        type: 'chat',
        receiverId: receiverId,
        content: content,
        messageType: messageType,
        userId: currentUser.id,
        senderName: currentUser.username
    };

    return sendWebSocketMessageEnhanced(message);
}

// Send typing indicator
function sendTypingIndicator(receiverId, isTyping = true) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        console.error('No current user found');
        return false;
    }

    const messageType = isTyping ? 'typing' : 'typing_stopped';
    const message = {
        type: messageType,
        receiverId: receiverId,
        userId: currentUser.id,
        senderName: currentUser.username
    };

    return sendWebSocketMessageEnhanced(message);
}

// Enhanced sendWebSocketMessage to handle new message format
function sendWebSocketMessageEnhanced(messageData) {
    if (!socket) {
        console.error('WebSocket not initialized');
        return false;
    }

    if (socket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket not connected');
        return false;
    }

    try {
        socket.send(JSON.stringify(messageData));
        console.log('WebSocket message sent:', messageData.type);
        return true;
    } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
    }
}

// Export functions
export {
    connectWebSocket,
    sendWebSocketMessage,
    logoutUser,
    sendStatusWhenReady,
    sendChatMessage,
    sendTypingIndicator,
    sendWebSocketMessageEnhanced
};
