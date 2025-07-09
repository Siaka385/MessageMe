import jwt from "jsonwebtoken";
import dotenv from "dotenv";


dotenv.config();
// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;



//generate User token
export const generateToken = (userId) => {
    return jwt.sign(
        {userId},JWT_SECRET,{
            expiresIn:"24h"
        })
}



// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
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
