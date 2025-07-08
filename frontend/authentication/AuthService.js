// Authentication API Service
class AuthService {
    constructor() {
        // You can configure your API base URL here
        this.baseURL = 'http://localhost:3000/api/auth'; // Change this to your actual API URL
        this.headers = {
            'Content-Type': 'application/json',
        };
        this.useMockAPI = true; // Set to false when you have a real backend
    }

    // Sign In API call
    async signIn(email, password) {
        if (this.useMockAPI) {
            return this.mockSignIn(email, password);
        }

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
        if (this.useMockAPI) {
            return this.mockSignUp(name, email, password);
        }

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
    // Sign out
    async signOut() {
        try {
            const token = localStorage.getItem('userToken');

            if (token) {
                await fetch(`${this.baseURL}/signout`, {
                    method: 'POST',
                    headers: {
                        ...this.headers,
                        'Authorization': `Bearer ${token}`
                    }
                });
            }

            // Clear local storage
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');

            return {
                success: true,
                message: 'Signed out successfully'
            };

        } catch (error) {
            console.error('Sign out error:', error);
            // Still clear local storage even if API call fails
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');

            return {
                success: true,
                message: 'Signed out successfully'
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

    // Mock API methods for testing
    async mockSignIn(email, password) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock validation
        if (!email || !password) {
            return {
                success: false,
                message: 'Email and password are required'
            };
        }

        // Check for dummy admin credentials
        if (email === 'admin@gmail.com' && password === '123456') {
            const mockToken = 'admin_token_' + Date.now();
            const mockUser = {
                id: 1,
                name: 'Admin User',
                email: 'admin@gmail.com',
                role: 'admin'
            };

            localStorage.setItem('userToken', mockToken);
            localStorage.setItem('userData', JSON.stringify(mockUser));

            return {
                success: true,
                data: {
                    token: mockToken,
                    user: mockUser
                },
                message: 'Welcome Admin!'
            };
        }

        // Check for other valid credentials (for testing)
        if (password.length < 4) {
            return {
                success: false,
                message: 'Invalid credentials'
            };
        }

        // Mock successful sign in for other users
        const mockToken = 'mock_jwt_token_' + Date.now();
        const mockUser = {
            id: Date.now(),
            name: 'John Doe',
            email: email
        };

        localStorage.setItem('userToken', mockToken);
        localStorage.setItem('userData', JSON.stringify(mockUser));

        return {
            success: true,
            data: {
                token: mockToken,
                user: mockUser
            },
            message: 'Sign in successful'
        };
    }

    async mockSignUp(name, email, password) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Mock validation
        if (!name || !email || !password) {
            return {
                success: false,
                message: 'All fields are required'
            };
        }

        if (password.length < 6) {
            return {
                success: false,
                message: 'Password must be at least 6 characters'
            };
        }

        // Mock email already exists check
        if (email === 'test@example.com') {
            return {
                success: false,
                message: 'Email already exists'
            };
        }

        // Mock successful sign up
        return {
            success: true,
            data: {
                user: {
                    id: Date.now(),
                    name: name,
                    email: email
                }
            },
            message: 'Account created successfully'
        };
    }
}

// Export singleton instance
export const authService = new AuthService();
