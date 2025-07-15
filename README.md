# MessageMe

MessageMe is a full-stack web application for real-time chat and messaging. It features a secure authentication system built with Node.js and Express, and a dynamic vanilla JavaScript frontend.

## Features

*   **User Authentication**: Secure user registration and login system.
*   **JWT-Based Security**: Uses JSON Web Tokens (JWT) for securing API endpoints.
*   **RESTful API**: A well-structured backend API for handling users and messages.
*   **Client-Side Validation**: Real-time validation on sign-in and sign-up forms.
*   **Persistent Storage**: Uses SQLite for a lightweight and file-based database.
*   **Modular Frontend**: The frontend is built with modern JavaScript modules for clean and maintainable code.

## Tech Stack

### Backend

*   **[Node.js](https://nodejs.org/)**: JavaScript runtime environment.
*   **[Express.js](https://expressjs.com/)**: Web framework for Node.js.
*   **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)**: For database interaction.
*   **[bcrypt](https://www.npmjs.com/package/bcrypt)**: For hashing passwords.
*   **[jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)**: For creating and verifying JWTs.
*   **[cors](https://www.npmjs.com/package/cors)**: For enabling Cross-Origin Resource Sharing.

### Frontend

*   **Vanilla JavaScript (ES6+)**: For all client-side logic.
*   **HTML5**: For structuring the application.
*   **CSS3**: For styling (styles not included in the provided files).

---
## Installation & Setup

Follow these steps to get your development environment set up.

### 1. Clone the Repository

```bash
git clone https://github.com/Siaka385/MessageMe.git
cd MessageMe
```

### 2. Backend Setup

The backend server handles all API requests, authentication, and database operations.

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install
```

The application will create and use a SQLite database file at `Database/message.db` relative to the project root.

### 3. Frontend Setup

The frontend is built with vanilla JavaScript and does not require a build step. It can be served directly as static files.

---

## Running the Application

### 1. Start the Backend Server

From the `backend` directory, run:

```bash
node server.js
```

The server will start on `http://localhost:3000`. You should see log messages in your terminal indicating that the server and database have been initialized.

---

## Environment Variables

Before running the backend, create a `.env` file inside the `backend/` directory with the following content:

```
JWT_SECRET="your_secret_key"
TOKEN_EXPIRATION="24h"
```
- `JWT_SECRET`: Secret key for signing JWT tokens (choose a strong, random value)
- `TOKEN_EXPIRATION`: Token expiration time (e.g., `24h`)

---

## Accessing the App

- Open `backend/public/index.html` in your browser for the frontend UI.
- The backend API will be available at `http://localhost:3000` (or the port specified in your server config).

## Project Structure
- `backend/` - Node.js backend (API, authentication, messaging)
- `backend/public/` - Frontend files (HTML, JS, CSS)
- `Database/` - SQLite database file

## License
MIT

