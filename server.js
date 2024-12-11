import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());

/**
 * Initialize JWKS (JSON Web Key Set) client for Privy token verification
 * JWKS is a set of keys containing the public keys used to verify any JWT issued by Privy
 * The client will cache and rate limit requests to the JWKS endpoint
 */
const client = jwksClient({
    jwksUri: process.env.PRIVY_JWKS_URI || 'https://auth.privy.io/api/v1/jwks',
    cache: true,
    rateLimit: true
});

/**
 * Retrieves the signing key from Privy's JWKS endpoint
 * This key is used to verify the JWT tokens issued by Privy
 * @param {Object} header - JWT header containing the key ID (kid)
 * @param {Function} callback - Callback function to return the signing key
 */
async function getKey(header, callback) {
    try {
        const key = await client.getSigningKey(header.kid);
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    } catch (err) {
        console.error('Error getting signing key:', err);
        callback(err);
    }
}

/**
 * Initialize SQLite database with user table
 * Creates the table if it doesn't exist
 * @returns {Promise<Database>} Database instance
 */
const initDb = async () => {
    try {
        const db = await open({
            filename: './users.db',
            driver: sqlite3.Database
        });

        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                user_string TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Database initialized successfully');
        return db;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};

/**
 * Fetches user details from Privy API
 * @param {string} userId - The Privy user ID
 * @returns {Promise<Object>} User details from Privy
 */
const appId = process.env.VITE_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;
async function fetchPrivyUserDetails(userId) {
    try {
      const response = await fetch(`https://auth.privy.io/api/v1/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${appId}:${appSecret}`),
          'privy-app-id': appId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
}

/**
 * Middleware to verify Privy JWT tokens
 * Checks for Bearer token in Authorization header
 * Verifies token using Privy's public key from JWKS
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Bearer jfievj93kj0rg....
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, getKey, {
        algorithms: ['ES256'], // Privy uses ECDSA with SHA-256
        issuer: 'privy.io',
        audience: process.env.VITE_PRIVY_APP_ID
    }, (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err);
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        req.user = decoded;
        console.log("req.user", req.user);
        next();
    });
};

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// New endpoint for verification and data retrieval
app.post('/api/verify-user', async (req, res) => {
    try {
        const { authToken } = req.body;
        console.log("authToken", authToken)
        
        if (!authToken) {
            return res.status(400).json({ success: false, message: 'No token provided' });
        }

        // Verify the JWT token
        jwt.verify(authToken, getKey, {
            algorithms: ['ES256'],
            issuer: 'privy.io',
            audience: process.env.VITE_PRIVY_APP_ID
        }, (err, decoded) => {
            if (err) {
                console.error('Token verification failed:', err);
                return res.status(401).json({ success: false, message: 'Invalid token' });
            }

            // Generate random number
            const randomNumber = Math.floor(Math.random() * 1000);
            console.log(`User ${decoded.sub} verified. Generated number: ${randomNumber}`);
            
            res.json({
                success: true,
                data: {
                    randomNumber,
                    userId: decoded.sub
                }
            });
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// New submit-string endpoint
app.post('/api/submit-string', verifyToken, async (req, res) => {
    try {
        const { userString } = req.body;
        const userId = req.user.sub;

        // Still fetch user details for logging purposes
        const privyUserData = await fetchPrivyUserDetails(userId);
        console.log("privyUserData", privyUserData);

        console.log('\n--- New String Submission ---');
        console.log('User ID:', userId);
        console.log('JWT User Object:', req.user);
        console.log('Submitted String:', userString);

        if (!userString || !userString.trim()) {
            console.log('Error: Empty string submitted');
            return res.status(400).json({ success: false, message: 'String is required' });
        }

        const db = await initDb();
        const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

        if (existingUser) {
            await db.run(
                'UPDATE users SET user_string = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [userString, userId]
            );
            console.log('User data updated successfully');
        } else {
            await db.run(
                'INSERT INTO users (id, user_string) VALUES (?, ?)',
                [userId, userString]
            );
            console.log('New user created successfully');
        }

        const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        console.log('\nFinal user state:', updatedUser);
        console.log('--- End String Submission ---\n');

        res.json({ success: true, message: 'String saved successfully' });
    } catch (error) {
        console.error('\nError in string submission:', error);
        console.error('User ID:', req.user?.sub);
        console.error('Attempted string:', req.body?.userString);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Handle all routes by serving index.html (for client-side routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// Initialize the database and start the server
const startServer = async () => {
    try {
        // Initialize the database first
        const db = await initDb();
        
        // Store db instance for reuse
        app.locals.db = db;
        
        // Start the server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log('Database connection established');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();
