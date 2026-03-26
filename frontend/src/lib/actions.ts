"use server"

import { getServerSession } from "next-auth/next";
import {
  persistMessage as persistToAPI,
  fetchUserHistory as getHistoryFromAPI,
  persistPreferences as persistPreferencesToAPI,
  fetchUserPreferences as getUserPreferencesFromAPI,
  deleteUserMessageLog as deleteFromAPI
} from "./api-service";
import type { AgentMessage } from "./ai-agent";

/**
 * Server Action to extract text from PDF or Word files.
 * Uses dynamic imports to keep Node-only libraries away from the client bundle.
 */
export async function extractTextFromFile(base64: string, mimeType: string): Promise<string> {
  const base64Data = base64.split(",")[1] || base64;
  const buffer = Buffer.from(base64Data, "base64");

  if (mimeType === "application/pdf") {
    try {
      // pdf-parse uses a specific export structure that can be tricky in ESM
      const pdf = require("pdf-parse");
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error("Error parsing PDF:", error);
      throw new Error("No se pudo leer el archivo PDF.");
    }
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error("Error parsing Word document:", error);
      throw new Error("No se pudo leer el archivo de Word.");
    }
  } else if (mimeType.startsWith("text/")) {
    return buffer.toString("utf8");
  } else {
    throw new Error(`Tipo de archivo no soportado: ${mimeType}`);
  }
}

interface UserPreferences {
  readingLevel: string;
  tone: string;
  highContrast: boolean;
  textToSpeech: boolean;
}

interface SessionUser {
  id?: string;
  email?: string;
}

/**
 * Server Action to persist a single message via the backend API.
 * It automatically identifies the user from the current session.
 */
export async function persistMessage(message: AgentMessage) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return null;

    const user = session.user as SessionUser & { backendToken?: string };
    const userId = user.id || session.user.email;
    const token = user.backendToken;
    return await persistToAPI(userId, message, token);
  } catch (error) {
    console.error("Action error persisting message:", error);
    return null;
  }
}

export async function deleteUserMessageLog(messageId: string) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return;

    const user = session.user as SessionUser & { backendToken?: string };
    const userId = user.id || session.user.email;
    const token = user.backendToken;

    await deleteFromAPI(userId, messageId, token);
  } catch (error) {
    console.error("Action error deleting message:", error);
  }
}

/**
 * Server Action to fetch the latest chat history for the logged-in user via the backend API.
 */
export async function fetchUserHistory() {
  try {
    const session = await getServerSession();

    console.log("[SERVER-ACTION] Full session:", session);

    if (!session?.user?.email) return [];

    const user = session.user as any;
    const userId = user.id || session.user.email;
    const token = user.backendToken || user.access_token; // Try both properties

    console.log("[SERVER-ACTION] userId:", userId);
    console.log("[SERVER-ACTION] token:", token);

    return await getHistoryFromAPI(userId, token);
  } catch (error) {
    console.error("Action error fetching history:", error);
    return [];
  }
}

/**
 * Server Action to sync user preferences to the backend API.
 */
export async function persistPreferences(preferences: UserPreferences) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return;

    const user = session.user as SessionUser & { backendToken?: string };
    const userId = user.id || session.user.email;
    const token = user.backendToken;
    await persistPreferencesToAPI(userId, preferences, token);
  } catch (error) {
    console.error("Action error persisting preferences:", error);
  }
}

/**
 * Server Action to load user preferences from the backend API on app startup.
 */
export async function fetchUserPreferences() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return null;

    const user = session.user as SessionUser & { backendToken?: string };
    const userId = user.id || session.user.email;
    const token = user.backendToken;
    return await getUserPreferencesFromAPI(userId, token);
  } catch (error) {
    console.error("Action error fetching preferences:", error);
    return null;
  }
}

/**
 * Checks if the required Azure AD environment variables are configured.
 */
export async function isAzureConfigured() {
  return !!(
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  );
}

/**
 * Server Action to register a new user via the backend API.
 * This is called from the signup page and handles the registration securely from the server.
 */
export async function registerUser(email: string, name: string, password: string) {
  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://host.docker.internal:8000";

    // Log what we're sending
    console.log("[registerUser] Sending registration data:", {
      email,
      name,
      password_length: password.length,
      password_bytes: Buffer.byteLength(password, 'utf8'),
      password: password
    });

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

    console.log("[registerUser] Response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.log("[registerUser] Error response:", error);
      throw new Error(error.detail || "Error al registrar usuario");
    }

    const data = await response.json();
    return {
      success: true,
      user: {
        id: data.user_id,
        email: data.email,
        name: data.name,
      },
    };
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}
