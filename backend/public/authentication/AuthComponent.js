export function renderAuthenticationComponent() {
    return `
    <div class="auth-container">
        <div class="logo">
            <h1>MessageMe</h1>
            <p>Connect, Chat, Share</p>
        </div>

        <div class="form-container">
            <!-- Sign In Form -->
            <form id="signin-form" class="form active">
                <div class="form-group">
                    <label for="signin-email">Email Address</label>
                    <input type="email" id="signin-email" placeholder="Enter your email" required>
                    <div class="error-message" id="signin-email-error"></div>
                </div>

                <div class="form-group">
                    <label for="signin-password">Password</label>
                    <input type="password" id="signin-password" placeholder="Enter your password" required>
                    <div class="error-message" id="signin-password-error"></div>
                </div>

                <button type="submit" class="submit-btn">Sign In</button>
                <div class="success-message" id="signin-success"></div>
            </form>

            <!-- Sign Up Form -->
            <form id="signup-form" class="form">
                <div class="form-group">
                    <label for="signup-name">Full Name</label>
                    <input type="text" id="signup-name" placeholder="Enter your full name" required>
                    <div class="error-message" id="signup-name-error"></div>
                </div>

                <div class="form-group">
                    <label for="signup-email">Email Address</label>
                    <input type="email" id="signup-email" placeholder="Enter your email" required>
                    <div class="error-message" id="signup-email-error"></div>
                </div>

                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <input type="password" id="signup-password" placeholder="Create a password" required>
                    <div class="error-message" id="signup-password-error"></div>
                </div>

                <div class="form-group">
                    <label for="signup-confirm">Confirm Password</label>
                    <input type="password" id="signup-confirm" placeholder="Confirm your password" required>
                    <div class="error-message" id="signup-confirm-error"></div>
                </div>

                <button type="submit" class="submit-btn">Sign Up</button>
                <div class="success-message" id="signup-success"></div>
            </form>
        </div>

        <div class="toggle-container">
            <span class="toggle-text" id="toggle-text">Don't have an account? </span>
            <a href="#" class="toggle-link" id="toggle-link">Sign Up</a>
        </div>
    </div>
    `;
}