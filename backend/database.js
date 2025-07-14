import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initDb() {
    const dbPath = path.join(__dirname, '..', 'Database', 'message.db');
    console.log('Database path:', dbPath);

    // Ensure the database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    return new Database(dbPath);
}

export function InitiliazeDbTables(db) {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          online BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id INTEGER NOT NULL,
          receiver_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          is_read BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

}

export function AddUserToTable(db, email, username, password_hash) {
    var statemnet = db.prepare(`
        INSERT INTO users (email, username, password_hash)
        VALUES (?, ?, ?)
      `);
    statemnet.run(email, username, password_hash);
}

export function AddMessageToTable(db, user_id, message, message_type) {
    var statemnet = db.prepare(`
        INSERT INTO messages (user_id, message, message_type)
        VALUES (?, ?, ?)
      `);
    statemnet.run(user_id, message, message_type);
}

export function UpdateUserOnlineStatus(db, userid, isOnline) {
    isOnline = isOnline ? 1 :0;
    const statement = db.prepare('UPDATE users SET online = ? WHERE id = ?');
    statement.run(isOnline, userid);
}


export function getUserByEmail(db, email) {
    const statement = db.prepare('SELECT * FROM users WHERE email = ?');
    return statement.get(email);
}

export function getUserByUsername(db, username) {
    const statement = db.prepare('SELECT * FROM users WHERE username = ?');
    return statement.get(username);
}

export function getUserById(db, id) {
    const statement = db.prepare('SELECT * FROM users WHERE id = ?');
    return statement.get(id);
}

export function getAllUsers(db, currentUserId) {
    const statement = db.prepare('SELECT id, email, username, online, created_at FROM users WHERE id != ? ORDER BY created_at DESC');
    return statement.all(currentUserId);
}

// Message-related functions
export function addMessage(db, senderId, receiverId, message, messageType = 'text') {
    const statement = db.prepare(`
        INSERT INTO messages (sender_id, receiver_id, message, message_type, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    `);
    return statement.run(senderId, receiverId, message, messageType);
}

export function getMessagesBetweenUsers(db, userId1, userId2, limit = 50, offset = 0) {
    const statement = db.prepare(`
        SELECT m.*,
               u1.username as sender_name,
               u2.username as receiver_name
        FROM messages m
        JOIN users u1 ON m.sender_id = u1.id
        JOIN users u2 ON m.receiver_id = u2.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?)
           OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.created_at ASC
        LIMIT ? OFFSET ?
    `);
    return statement.all(userId1, userId2, userId2, userId1, limit, offset);
}

export function getConversationsForUser(db, userId) {
    const statement = db.prepare(`
        SELECT
            CASE
                WHEN m.sender_id = ? THEN m.receiver_id
                ELSE m.sender_id
            END as other_user_id,
            CASE
                WHEN m.sender_id = ? THEN u2.username
                ELSE u1.username
            END as other_user_name,
            m.message as last_message,
            m.created_at as last_message_time,
            COUNT(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 END) as unread_count,
            u2.online as is_online
        FROM messages m
        JOIN users u1 ON m.sender_id = u1.id
        JOIN users u2 ON m.receiver_id = u2.id
        WHERE m.sender_id = ? OR m.receiver_id = ?
        GROUP BY other_user_id, other_user_name
        HAVING m.created_at = (
            SELECT MAX(m2.created_at)
            FROM messages m2
            WHERE (m2.sender_id = ? AND m2.receiver_id = other_user_id)
               OR (m2.sender_id = other_user_id AND m2.receiver_id = ?)
        )
        ORDER BY m.created_at DESC
    `);
    return statement.all(userId, userId, userId, userId, userId, userId, userId);
}

export function markMessagesAsRead(db, senderId, receiverId) {
    const statement = db.prepare(`
        UPDATE messages
        SET is_read = 1
        WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `);
    return statement.run(senderId, receiverId);
}

export function getMessageById(db, messageId) {
    const statement = db.prepare('SELECT * FROM messages WHERE id = ?');
    return statement.get(messageId);
}

