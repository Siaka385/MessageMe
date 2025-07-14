//import { authService } from './AuthService.js';

class AuthManager {
    constructor() {
        this.isSignIn = true;
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.signinForm = document.getElementById('signin-form');
        this.signupForm = document.getElementById('signup-form');
        this.toggleLink = document.getElementById('toggle-link');
        this.toggleText = document.getElementById('toggle-text');
    }

    attachEventListeners() {
        this.toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleForm();
        });

        this.signinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignIn();
        });

        this.signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignUp();
        });

        // Real-time validation
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
        });
    }

    toggleForm() {
        this.isSignIn = !this.isSignIn;

        if (this.isSignIn) {
            this.signinForm.classList.add('active');
            this.signupForm.classList.remove('active');
            this.toggleText.textContent = "Don't have an account? ";
            this.toggleLink.textContent = "Sign Up";
        } else {
            this.signinForm.classList.remove('active');
            this.signupForm.classList.add('active');
            this.toggleText.textContent = "Already have an account? ";
            this.toggleLink.textContent = "Sign In";
        }

        this.clearMessages();
    }

    validateField(field) {
        const value = field.value.trim();
        const errorElement = document.getElementById(field.id + '-error');

        switch (field.type) {
            case 'email':
                if (!this.isValidEmail(value)) {
                    this.showError(errorElement, 'Please enter a valid email address');
                    return false;
                }
                break;
            case 'password':
                if (value.length < 6) {
                    this.showError(errorElement, 'Password must be at least 6 characters');
                    return false;
                }
                break;
            case 'text':
                if (value.length < 2) {
                    this.showError(errorElement, 'Name must be at least 2 characters');
                    return false;
                }
                break;
        }

        // Check password confirmation
        if (field.id === 'signup-confirm') {
            const password = document.getElementById('signup-password').value;
            if (value !== password) {
                this.showError(errorElement, 'Passwords do not match');
                return false;
            }
        }

        this.hideError(errorElement);
        return true;
    }

    async handleSignIn() {
        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;

        if (!this.validateForm('signin')) return;

        this.showLoading(true);

        try {
            const { authService } = await import('./AuthService.js');
            const result = await authService.signIn(email, password);

            this.showLoading(false);

            if (result.success) {
                this.showSuccess('signin-success', 'Welcome back! Redirecting...');
            
                 const { sendWebSocketMessage } = await import("../websocket.js");
                    sendWebSocketMessage("status",result.data.user.id,"" , "");
                setTimeout(() => {
                   // Reload page to trigger main app load
                   window.location.reload();
                }, 1500);
            } else {
                this.showError(document.getElementById('signin-email-error'), result.message);
            }
        } catch (error) {
            this.showLoading(false);
            console.log(error)
            this.showError(document.getElementById('signin-email-error'), 'An unexpected error occurred');
        }
    }

    async handleSignUp() {
        if (!this.validateForm('signup')) return;

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;

        this.showLoading(true);

        try {
            const { authService } = await import('./AuthService.js');
            const result = await authService.signUp(name, email, password);

            this.showLoading(false);

            if (result.success) {
                this.showSuccess('signup-success', 'Account created successfully! Redirecting to sign in...');
                setTimeout(() => {
                    this.toggleForm();
                }, 2000);
            } else {
                this.showError(document.getElementById('signup-email-error'), result.message);
            }
        } catch (error) {
            this.showLoading(false);
            this.showError(document.getElementById('signup-email-error'), 'An unexpected error occurred');
        }
    }

    validateForm(type) {
        const form = document.getElementById(type + '-form');
        const inputs = form.querySelectorAll('input');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    hideError(element) {
        element.style.display = 'none';
    }

    showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.style.display = 'block';
    }

    clearMessages() {
        document.querySelectorAll('.error-message, .success-message').forEach(el => {
            el.style.display = 'none';
        });
    }

    showLoading(show) {
        const submitBtns = document.querySelectorAll('.submit-btn');
        submitBtns.forEach(btn => {
            btn.disabled = show;
            if (show) {
                btn.textContent = 'Please wait...';
            } else {
                // Determine button text based on current form
                if (btn.closest('#signin-form')) {
                    btn.textContent = 'Sign In';
                } else if (btn.closest('#signup-form')) {
                    btn.textContent = 'Sign Up';
                }
            }
        });
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }


}

// Initialize the auth manager when DOM is loaded
    new AuthManager();

