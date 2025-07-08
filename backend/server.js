import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


const app = express();


const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};


// Middleware
app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

app.post('/auth', async (req, res) => {
    try {
        const { username, email, password} = req.body;
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required'
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Username must be at least 3 characters long'
            });
        }


        // Check if user already exists
        const existingUserByEmail = getUserByEmail.get(email);
        if (existingUserByEmail) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists'
            });
        }


        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert user into database
        const result = insertUser.run(
            email,
            username,
            hashedPassword,
            username // Use username as nickname by default
        );

        console.log('User created successfully:', { id: result.lastInsertRowid, username, email });

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            user: {
                id: result.lastInsertRowid,
                username,
                email,
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

// This route handles user login.
// It validates the user's input, checks if the user exists, and compares the password with the hashed password in the database.
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = getUserByEmail.get(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

         const token = jwt.sign({ userId: user.id}, 'your-secret-key', {
                expiresIn: '1h'
     });


        res.json({
            success: true,
            message: 'Login successful!',
            usertoken:token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
  console.log(`📊 Database connected successfully`);
});
