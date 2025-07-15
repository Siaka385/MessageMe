// Authentication API Service
class AuthService {
    constructor() {
        this.baseURL = 'http://localhost:3000/api/auth';
        this.headers = {
            'Content-Type': 'application/json',
        };
    }

    // Sign In API call
    async signIn(email, password) {

        try {
            const response = await fetch(`${this.baseURL}/signin`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Sign in failed');
            }

            // Store token if successful
            if (data.token) {
                localStorage.setItem('userToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));
            }

            return {
                success: true,
                data: data,
                message: data.message || 'Sign in successful'
            };

        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                message: error.message || 'Network error occurred'
            };
        }
    }

    // Sign Up API call
    async signUp(name, email, password) {

        try {
            const response = await fetch(`${this.baseURL}/signup`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Sign up failed');
            }

            return {
                success: true,
                data: data,
                message: data.message || 'Account created successfully'
            };

        } catch (error) {
            console.error('Sign up error:', error);
            return {
                success: false,
                message: error.message || 'Network error occurred'
            };
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem('userToken');
        return !!token;
    }

    // Get current user data
    getCurrentUser() {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    // Get auth token
    getToken() {
        return localStorage.getItem('userToken');
    }

    // Verify token with server
    async verifyToken() {
        try {
            const token = this.getToken();
            if (!token) return false;

            const response = await fetch(`${this.baseURL}/verify`, {
                method: 'GET',
                headers: {
                    ...this.headers,
                    'Authorization': `Bearer ${token}`
                }
            });
             
            return response.ok;

        } catch (error) {
            console.error('Token verification error:', error);
            return false;
        }
    }
}

export const authService = new AuthService();
