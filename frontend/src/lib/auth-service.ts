/**
 * Authentication Service
 * Handles user authentication with the backend API
 * Manages JWT tokens in localStorage
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://backend:8000";

const CSRF_TOKEN_KEY = "cognicare_access_token";
const REFRESH_TOKEN_KEY = "cognicare_refresh_token";
const USER_ID_KEY = "cognicare_user_id";

export interface AuthUser {
    user_id: string;
    email: string;
    name: string;
    access_token: string;
    refresh_token?: string;
    expires_in: number;
}

export interface AuthResponse {
    user_id: string;
    email: string;
    name: string;
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
}

/**
 * Store tokens in localStorage
 */
function storeTokens(accessToken: string, refreshToken?: string, userId?: string) {
    if (typeof window !== "undefined") {
        localStorage.setItem(CSRF_TOKEN_KEY, accessToken);
        if (refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
        if (userId) {
            localStorage.setItem(USER_ID_KEY, userId);
        }
    }
}

/**
 * Clear tokens from localStorage
 */
function clearTokens() {
    if (typeof window !== "undefined") {
        localStorage.removeItem(CSRF_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
    }
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
    if (typeof window !== "undefined") {
        return localStorage.getItem(CSRF_TOKEN_KEY);
    }
    return null;
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
}

/**
 * Get stored user ID
 */
export function getStoredUserId(): string | null {
    if (typeof window !== "undefined") {
        return localStorage.getItem(USER_ID_KEY);
    }
    return null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    const token = getAccessToken();
    return !!token && token.length > 0;
}

/**
 * Register a new user
 */
export async function register(
    email: string,
    name: string,
    password: string
): Promise<AuthUser | null> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                name,
                password,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Registration failed");
        }

        const data: AuthResponse = await response.json();

        // Store tokens and user ID
        storeTokens(data.access_token, data.refresh_token, data.user_id);

        return {
            user_id: data.user_id,
            email: data.email,
            name: data.name,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
        };
    } catch (error) {
        console.error("Registration error:", error);
        return null;
    }
}

/**
 * Login user with email and password
 */
export async function login(
    email: string,
    password: string
): Promise<AuthUser | null> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Login failed");
        }

        const data: AuthResponse = await response.json();

        // Store tokens and user ID
        storeTokens(data.access_token, data.refresh_token, data.user_id);

        return {
            user_id: data.user_id,
            email: data.email,
            name: data.name,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
        };
    } catch (error) {
        console.error("Login error:", error);
        return null;
    }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<AuthUser | null> {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            return null;
        }

        const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                refresh_token: refreshToken,
            }),
        });

        if (!response.ok) {
            // Refresh failed, clear tokens
            clearTokens();
            return null;
        }

        const data: AuthResponse = await response.json();

        // Store new tokens
        storeTokens(data.access_token, data.refresh_token, data.user_id);

        return {
            user_id: data.user_id,
            email: data.email,
            name: data.name,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
        };
    } catch (error) {
        console.error("Token refresh error:", error);
        clearTokens();
        return null;
    }
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const accessToken = getAccessToken();
        if (!accessToken) {
            return null;
        }

        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, try to refresh
                return refreshAccessToken();
            }
            return null;
        }

        const data = await response.json();
        return {
            user_id: data.user_id,
            email: data.email,
            name: data.name,
            access_token: accessToken,
            expires_in: 0, // Not provided in this endpoint
        };
    } catch (error) {
        console.error("Error fetching current user:", error);
        return null;
    }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
    try {
        const accessToken = getAccessToken();
        if (accessToken) {
            await fetch(`${BACKEND_URL}/api/auth/logout`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                },
            });
        }
    } catch (error) {
        console.error("Error during logout:", error);
    } finally {
        // Clear tokens regardless of API response
        clearTokens();
    }
}
