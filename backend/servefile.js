import path from "path";
import { fileURLToPath } from "url";
import express from "express";


export default function servefile(app) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Step 1: Serve static files from "public" directory
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
      });
    
}