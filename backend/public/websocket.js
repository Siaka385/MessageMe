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

// // Handle chat messages
// function handleChatMessage(message) {
//     const queryParams = new URLSearchParams(window.location.search);
//     const currentChat = queryParams.get("chat");
//     const currentPath = window.location.pathname;

//     // Only process messages from the current chat
//     if (currentPath === "/privatemessages" && (message.sender_name === currentChat || message.receiver_name === currentChat)) {
//         // Create new message element
//         const messageTime = new Date(message.timestamp).toLocaleTimeString([], {day:"numeric",month:"long",year:"numeric", hour: '2-digit', minute: '2-digit' });
//         const newMessage = document.createElement('div');

//         // Determine if this is a sent or received message
//         const isSent = message.sender_name !== currentChat;
//         newMessage.className = `message ${isSent ? 'sent' : 'received'}`;

//         newMessage.innerHTML = `
//             <div class="message-content">
//                 <p>${message.content}</p>
//             </div>
//             <div class="message-time">${messageTime}</div>
//         `;

//         // Add to messages container
//         const messagesContainer = document.querySelector('.messages-container');
//         if (messagesContainer) {
//             messagesContainer.appendChild(newMessage);

//             // Scroll to bottom
//             messagesContainer.scrollTop = messagesContainer.scrollHeight;

//             // If this is a received message and we're in the chat with the sender,
//             // mark it as read
//             if (!isSent && currentPath === "/privatemessages") {
//                 fetch('/notifications/mark-read-for-sender', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify({ sender_name: message.sender_name })
//                 });
//             }
//         }
//     } else if (message.sender_name !== currentChat) {
//         // If we're not in the chat with the sender, update the unread count
//         // This will be handled by the updateNotificationBadge function
//     }

//     // Update last message in user list
//     updateLastMessage(message.sender_name, message.content);

//     // Update unread counts for all users
//     updateUnreadCountsDisplay();
// }

// Handle status updates for OTHER users (not current user)
function handleStatusUpdate(message) {
    console.log('Handling status update for OTHER user:', message.userId, 'status:', message.status);
    console.log('All user items in DOM:', document.querySelectorAll(".user-item"));
    console.log('Looking for user ID:', message.userId);

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

// // Update last message in user list
// function updateLastMessage(username, content) {
//     const userElement = document.querySelector(`#${username}`);
//     if (userElement) {
//         const lastMessageElement = userElement.querySelector('.last-message');
//         if (lastMessageElement) {
//             lastMessageElement.textContent = content;
//         }
//     }
// }

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

// // Send typing status via WebSocket
// function sendTypingStatus(receiverName, isTyping) {
//     if (!socket) {
//         console.error('WebSocket not initialized for typing status. Reconnecting...');
//         connectWebSocket();
//         return false;
//     }

//     if (socket.readyState !== WebSocket.OPEN) {
//         console.error('WebSocket not connected for typing status. Current state:',
//             socket.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
//             socket.readyState === WebSocket.CLOSING ? 'CLOSING' : 'CLOSED');
//         return false;
//     }

//     const message = {
//         type: isTyping ? 'typing' : 'typing_stopped',
//         content: '',
//         receiver_name: receiverName
//     };

//     try {
//         socket.send(JSON.stringify(message));
//         return true;
//     } catch (error) {
//         console.error('Error sending typing status:', error);
//         return false;
//     }
// }

// // Handle typing status
// function handleTypingStatus(message, isTyping) {
//     const queryParams = new URLSearchParams(window.location.search);
//     const currentChat = queryParams.get("chat");

//     // Only show typing indicator for the current chat
//     if (message.sender_name === currentChat) {
//         const typingIndicator = document.querySelector('.typing-indicator');

//         if (isTyping) {
//             // Show typing indicator if it doesn't exist
//             if (!typingIndicator) {
//                 const messagesContainer = document.querySelector('.messages-container');
//                 const newTypingIndicator = document.createElement('div');
//                 newTypingIndicator.className = 'typing-indicator';
//                 newTypingIndicator.innerHTML = `
//                     <div class="message received">
//                         <div class="message-content typing-text">
//                             <span class="typing-username">${message.sender_name}</span>
//                             <span class="typing-message">&nbspis typing</span>
//                             <span class="typing-dots">...</span>
//                         </div>
//                     </div>
//                 `;
//                 messagesContainer.appendChild(newTypingIndicator);

//                 // Scroll to bottom
//                 messagesContainer.scrollTop = messagesContainer.scrollHeight;
//             }
//         } else {
//             // Remove typing indicator if it exists
//             if (typingIndicator) {
//                 typingIndicator.remove();
//             }
//         }
//     }
// }

// // Update notification badge
// function updateNotificationBadge() {
//     // Fetch unread message count
//     fetch('/notifications/count')
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error('Network response was not ok');
//             }
//             return response.json();
//         })
//         .then(data => {
//             // Update badge with unread count
//             const count = data.unread_count;

//             // Update all message badges on the page
//             const badges = document.querySelectorAll('.message-badge');
//             badges.forEach(badge => {
//                 badge.textContent = count;

//                 // Show/hide badge based on count
//                 if (count > 0) {
//                     badge.style.display = 'flex';

//                     // Add animation class to message icon if it's in the navbar
//                     const messageIcon = badge.closest('.message-icon');
//                     if (messageIcon) {
//                         messageIcon.classList.add('has-new');
//                     }
//                 } else {
//                     badge.style.display = 'none';

//                     // Remove animation class from message icon
//                     const messageIcon = badge.closest('.message-icon');
//                     if (messageIcon) {
//                         messageIcon.classList.remove('has-new');
//                     }
//                 }
//             });
//         })
//         .catch(error => {
//             console.error('Error fetching notification count:', error);
//         });
// }

// // Mark messages as read
// function markMessagesAsRead() {
//     fetch('/notifications/mark-read', { method: 'POST' })
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error('Network response was not ok');
//             }
//             return response.json();
//         })
//         .then(() => {
//             // Update badge to show 0 unread messages
//             updateNotificationBadge();
//         })
//         .catch(error => {
//             console.error('Error marking messages as read:', error);
//         });
// }

// // Update unread counts display for all users
// async function updateUnreadCountsDisplay() {
//     // Only run this on the messages page
//     if (window.location.pathname !== '/privatemessages') return;

//     try {
//         const response = await fetch('/notifications/count-per-user');
//         if (!response.ok) {
//             throw new Error('Network response was not ok');
//         }

//         const data = await response.json();

//         // Create a map of username to unread count
//         const unreadCountMap = {};

//         // Check if data is an array and not null/undefined
//         if (Array.isArray(data)) {
//             data.forEach(item => {
//                 if (item && item.sender_name) {
//                     unreadCountMap[item.sender_name] = item.unread_count || 0;
//                 }
//             });
//         }

//         // Update unread count for each user in the list
//         const userItems = document.querySelectorAll('.user-item');
//         userItems.forEach(userItem => {
//             const username = userItem.id;
//             const unreadCount = unreadCountMap[username] || 0;
//             const unreadCountElement = userItem.querySelector('.unread-count');

//             if (unreadCount > 0) {
//                 unreadCountElement.textContent = unreadCount;
//                 unreadCountElement.style.display = 'flex';
//             } else {
//                 unreadCountElement.style.display = 'none';
//             }
//         });
//     } catch (error) {
//         console.error('Error updating unread counts:', error);
//     }
// }

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
function sendStatusWhenReady(userId) {
    waitForConnection(() => {
        sendWebSocketMessage("status", userId, "", "");
    });
}

// Export functions
export { connectWebSocket, sendWebSocketMessage, logoutUser, sendStatusWhenReady };
