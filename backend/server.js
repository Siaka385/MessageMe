import express from "express";
import cors from "cors";
import { initDb, InitiliazeDbTables} from "./database.js";
import servefile from "./serveIndex.js";
import { CallEndpoint } from "./EndPoints.js";
import dotenv from "dotenv";


dotenv.config();


const app = express();

// Database
var db = initDb();
console.log('Database initialized successfully');

//intiliaze Database tables
InitiliazeDbTables(db);
console.log('Database tables initialized successfully');



// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'file://'],
    credentials: true
}));


app.use(express.json());


//serrve file
servefile(app)

//handle endpoints
CallEndpoint(app, db)

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


}).on('error', (err) => {
    console.error('Failed to start server:', err);
});
