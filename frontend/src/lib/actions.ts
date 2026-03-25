"use server"

import { getServerSession } from "next-auth/next";
import {
  saveMessage as saveToCosmos,
  getUserHistory as getHistoryFromCosmos,
  saveUserPreferences,
  getUserPreferences,
  deleteMessage as deleteFromCosmos
} from "./cosmos";
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
 * Server Action to persist a single message to Cosmos DB.
 * It automatically identifies the user from the current session.
 */
export async function persistMessage(message: AgentMessage) {
  try {
    if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) return;

    const session = await getServerSession();
    if (!session?.user?.email) return null;

    const user = session.user as SessionUser;
    const userId = user.id || session.user.email;
    return await saveToCosmos(userId, message);
  } catch (error) {
    console.error("Action error persisting message:", error);
    return null;
  }
}

export async function deleteUserMessageLog(messageId: string) {
  try {
    if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) return;
    const session = await getServerSession();
    if (!session?.user?.email) return;
    
    const user = session.user as SessionUser;
    const userId = user.id || session.user.email;
    
    await deleteFromCosmos(userId, messageId);
  } catch (error) {
    console.error("Action error deleting message:", error);
  }
}

/**
 * Server Action to fetch the latest chat history for the logged-in user.
 */
export async function fetchUserHistory() {
  try {
    if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) return [];

    const session = await getServerSession();
    if (!session?.user?.email) return [];

    const user = session.user as SessionUser;
    const userId = user.id || session.user.email;
    return await getHistoryFromCosmos(userId);
  } catch (error) {
    console.error("Action error fetching history:", error);
    return [];
  }
}

/**
 * Server Action to sync user preferences to the database.
 */
export async function persistPreferences(preferences: UserPreferences) {
  try {
    if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) return;

    const session = await getServerSession();
    if (!session?.user?.email) return;

    const user = session.user as SessionUser;
    const userId = user.id || session.user.email;
    await saveUserPreferences(userId, preferences);
  } catch (error) {
    console.error("Action error persisting preferences:", error);
  }
}

/**
 * Server Action to load user preferences on app startup.
 */
export async function fetchUserPreferences() {
  try {
    if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) return null;

    const session = await getServerSession();
    if (!session?.user?.email) return null;

    const user = session.user as SessionUser;
    const userId = user.id || session.user.email;
    return await getUserPreferences(userId);
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
