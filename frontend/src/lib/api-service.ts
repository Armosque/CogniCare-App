/**
 * Frontend API Service for CogniCare Backend
 * Handles all HTTP communication with the FastAPI backend
 * Includes automatic JWT token handling
 * Works both on client and server (with getServerSession)
 */

import type { AgentMessage } from "./ai-agent";

// Import getAccessToken only on client side
let getAccessToken: (() => string | null) | null = null;
let refreshAccessToken: (() => Promise<any>) | null = null;

try {
    const authService = require("./auth-service");
    getAccessToken = authService.getAccessToken;
    refreshAccessToken = authService.refreshAccessToken;
} catch (error) {
    // Auth service not available (could be server context without getServerSession)
}

interface UserPreferences {
    readingLevel: string;
    tone: string;
    highContrast: boolean;
    textToSpeech: boolean;
}

interface MessageDTO {
    user_id: string;
    role: string;
    content: string;
    message_type: string;
    image?: string;
    document_text?: string;
    steps?: Array<{ title: string; bullets: string[]; duration?: string }>;
    explanation?: string;
    tags?: string[];
}

interface PreferenceDTO {
    user_id: string;
    reading_level: string;
    tone: string;
    high_contrast: boolean;
    text_to_speech: boolean;
    languages?: string[];
    notification_enabled?: boolean;
    notification_frequency?: string;
}

interface UserDTO {
    email: string;
    name: string;
    bio?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://backend:8000";

/**
 * Helper function to get authenticated fetch headers
 * On server side, you should pass the token explicitly
 */
function getAuthHeaders(additionalHeaders: Record<string, string> = {}, token?: string): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...additionalHeaders,
    };

    // Use explicit token if provided (server-side calls)
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        return headers;
    }

    // Try to get token from localStorage (client-side)
    if (typeof window !== "undefined" && getAccessToken) {
        const clientToken = getAccessToken();
        if (clientToken) {
            headers["Authorization"] = `Bearer ${clientToken}`;
        }
    }

    return headers;
}

/**
 * Authenticated fetch wrapper that handles token refresh
 * Only on client side
 */
async function authenticatedFetch(
    url: string,
    options: RequestInit = {},
    token?: string
): Promise<Response> {
    let response = await fetch(url, {
        ...options,
        headers: getAuthHeaders(options.headers as Record<string, string>, token),
    });

    // If unauthorized and no explicit token was provided, try to refresh (client-side only)
    if (response.status === 401 && !token && typeof window !== "undefined" && refreshAccessToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            response = await fetch(url, {
                ...options,
                headers: getAuthHeaders(options.headers as Record<string, string>, refreshed.access_token),
            });
        }
    }

    return response;
}

/**
 * Create a message via the backend API
 */
export async function persistMessage(userId: string, message: AgentMessage, token?: string) {
    try {
        const messageDTO: MessageDTO = {
            user_id: userId,
            role: message.role,
            content: message.content,
            message_type: message.type || "text",
            image: message.image,
            document_text: message.documentText,
            steps: message.steps?.map(step => ({
                title: step.title,
                bullets: step.bullets || [],
                duration: step.duration
            })),
            explanation: message.explanation,
            tags: []
        };

        const response = await authenticatedFetch(`${BACKEND_URL}/api/messages`, {
            method: "POST",
            body: JSON.stringify(messageDTO)
        }, token);

        if (!response.ok) {
            throw new Error(`Failed to persist message: ${response.statusText}`);
        }

        const result = await response.json();
        return result.id;
    } catch (error) {
        console.error("Error persisting message:", error);
        return null;
    }
}

/**
 * Fetch user message history from the backend API
 */
export async function fetchUserHistory(userId: string, token?: string) {
    try {
        const response = await authenticatedFetch(
            `${BACKEND_URL}/api/messages?skip=0&limit=50`,
            {
                method: "GET",
            },
            token
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        const messages = await response.json();

        // Map backend response to frontend AgentMessage format
        return messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            type: msg.message_type as "text" | "task-list" | "summary",
            image: msg.image,
            documentText: msg.document_text,
            steps: msg.steps,
            explanation: msg.explanation
        } as AgentMessage));
    } catch (error) {
        console.error("Error fetching user history:", error);
        return [];
    }
}

/**
 * Delete a message from the backend API
 */
export async function deleteUserMessageLog(userId: string, messageId: string, token?: string) {
    try {
        const response = await authenticatedFetch(
            `${BACKEND_URL}/api/messages/${messageId}`,
            {
                method: "DELETE"
            },
            token
        );

        if (!response.ok) {
            throw new Error(`Failed to delete message: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error deleting message:", error);
    }
}

/**
 * Save user preferences via the backend API
 */
export async function persistPreferences(userId: string, preferences: UserPreferences, token?: string) {
    try {
        const preferenceDTO: PreferenceDTO = {
            user_id: userId,
            reading_level: preferences.readingLevel,
            tone: preferences.tone,
            high_contrast: preferences.highContrast,
            text_to_speech: preferences.textToSpeech,
            languages: ["es"],
            notification_enabled: true,
            notification_frequency: "daily"
        };

        const response = await authenticatedFetch(`${BACKEND_URL}/api/preferences`, {
            method: "POST",
            body: JSON.stringify(preferenceDTO)
        }, token);

        if (!response.ok) {
            throw new Error(`Failed to persist preferences: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error persisting preferences:", error);
    }
}

/**
 * Fetch user preferences from the backend API
 */
export async function fetchUserPreferences(userId: string, token?: string) {
    try {
        const response = await authenticatedFetch(
            `${BACKEND_URL}/api/preferences`,
            {
                method: "GET",
            },
            token
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch preferences: ${response.statusText}`);
        }

        const data = await response.json();

        // Map backend response to frontend UserPreferences format
        return {
            readingLevel: data.reading_level || "simple",
            tone: data.tone || "motivador",
            highContrast: data.high_contrast || false,
            textToSpeech: data.text_to_speech || false
        };
    } catch (error) {
        console.error("Error fetching user preferences:", error);
        return null;
    }
}

/**
 * Create a new user profile via the backend API
 */
export async function createUserProfile(email: string, name: string, bio?: string, token?: string) {
    try {
        const userDTO: UserDTO = {
            email,
            name,
            bio: bio || ""
        };

        const response = await authenticatedFetch(`${BACKEND_URL}/api/users`, {
            method: "POST",
            body: JSON.stringify(userDTO)
        }, token);

        if (!response.ok) {
            throw new Error(`Failed to create user: ${response.statusText}`);
        }

        const result = await response.json();
        return result.id || result.user_id;
    } catch (error) {
        console.error("Error creating user profile:", error);
        return null;
    }
}

/**
 * Fetch user profile from the backend API
 */
export async function getUserProfile(userId: string, token?: string) {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/api/users/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

/**
 * Search messages via the backend API
 */
export async function searchMessages(userId: string, query: string, tags?: string[]) {
    try {
        const params = new URLSearchParams();
        params.append("user_id", userId);
        params.append("query", query);

        if (tags && tags.length > 0) {
            tags.forEach(tag => params.append("tags", tag));
        }

        const response = await fetch(`${BACKEND_URL}/api/messages/search?${params}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to search messages: ${response.statusText}`);
        }

        const messages = await response.json();

        // Map backend response to frontend AgentMessage format
        return messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            type: msg.message_type as "text" | "task-list" | "summary",
            image: msg.image,
            documentText: msg.document_text,
            steps: msg.steps,
            explanation: msg.explanation
        } as AgentMessage));
    } catch (error) {
        console.error("Error searching messages:", error);
        return [];
    }
}