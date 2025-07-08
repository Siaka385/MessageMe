import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { initDb, InitiliazeDbTables, AddUserToTable, getUserByEmail, getUserByUsername, getUserById, getAllUsers } from "./database.js";

const app = express();

// Database
console.log('Initializing database...');
var db = initDb();
console.log('Database initialized successfully');

//intiliaze Database tables
InitiliazeDbTables(db);
console.log('Database tables initialized successfully');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Helper function to hash passwords
async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}


// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'file://'],
    credentials: true
}));
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

// User Registration Endpoint
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }
        // Check if user already exists
        const existingUserByEmail = getUserByEmail(db, email);
        if (existingUserByEmail) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists'
            });
        }

        const existingUserByUsername = getUserByUsername(db, name);
        if (existingUserByUsername) {
            return res.status(409).json({
                success: false,
                message: 'This username is already taken'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert user into database
        AddUserToTable(db, email, name, hashedPassword);

        // Get the created user
        const newUser = getUserByEmail(db, email);

        console.log('User created successfully:', { id: newUser.id, username: name, email });

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            data: {
                user: {
                    id: newUser.id,
                    name: newUser.username,
                    email: newUser.email
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
});

// User Login Endpoint
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Check for admin credentials (dummy login)
        if (email === 'admin' && password === '1234') {
            const token = jwt.sign(
                {
                    userId: 0,
                    email: 'admin',
                    username: 'Admin User',
                    role: 'admin'
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.json({
                success: true,
                message: 'Welcome Admin!',
                token: token,
                user: {
                    id: 0,
                    name: 'Admin User',
                    email: 'admin',
                    role: 'admin'
                }
            });
        }

        // Check if user exists in database
        const user = getUserByEmail(db, email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                username: user.username
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('User logged in successfully:', { id: user.id, email: user.email });

        // Return success response
        res.json({
            success: true,
            message: 'Login successful!',
            token: token,
            user: {
                id: user.id,
                name: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
});


// Token verification endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    try {
        const user = getUserById(db, req.user.userId);
        if (!user && req.user.userId !== 0) { // Allow admin user (id: 0)
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: req.user.userId === 0 ? {
                id: 0,
                name: 'Admin User',
                email: 'admin',
                role: 'admin'
            } : {
                id: user.id,
                name: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Logout endpoint
app.post('/api/auth/signout', (req, res) => {
    // In a real application, you might want to blacklist the token
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Get all users endpoint (protected)
app.get('/api/users', authenticateToken, (req, res) => {
    try {
        const users = getAllUsers(db);
        res.json({
            success: true,
            users: users.map(user => ({
                id: user.id,
                name: user.username,
                email: user.email,
                created_at: user.created_at
            }))
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

const PORT = process.env.PORT || 3000;

// Add error handling for the server
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}...`);
  console.log(`📊 Database connected successfully`);
  console.log(`🔗 Test the server: curl http://localhost:${PORT}/test`);
}).on('error', (err) => {
    console.error('Failed to start server:', err);
});
