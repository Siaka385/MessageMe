import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function  initDb() {
    const dbPath = path.join(__dirname, '..', 'Database', 'message.db');
    console.log('Database path:', dbPath);
    return new Database(dbPath);
}

export function InitiliazeDbTables(db){
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      db.prepare(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          message_type TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

}

export function AddUserToTable(db, email, username, password_hash){
 var statemnet=db.prepare(`
        INSERT INTO users (email, username, password_hash)
        VALUES (?, ?, ?)
      `);
 statemnet.run(email, username, password_hash);
}
export function AddMessageToTable(db, user_id, message, message_type){
 var statemnet=   db.prepare(`
        INSERT INTO messages (user_id, message, message_type)
        VALUES (?, ?, ?)
      `);
 statemnet.run(user_id, message, message_type);
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

export function getAllUsers(db) {
    const statement = db.prepare('SELECT id, email, username, created_at FROM users');
    return statement.all();
}

