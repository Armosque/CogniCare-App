"use server"

import { getServerSession } from "next-auth/next";
import {
  saveMessage as saveToCosmos,
  getUserHistory as getHistoryFromCosmos,
  saveUserPreferences,
  getUserPreferences,
  deleteMessage as deleteFromCosmos,
} from "./cosmos";
import type { AgentMessage } from "./ai-agent";
import { isCosmosConfigured, isAzureAdConfigured } from "./env";
import { log } from "./log";

export async function extractTextFromFile(base64: string, mimeType: string): Promise<string> {
  const base64Data = base64.split(",")[1] || base64;
  const buffer = Buffer.from(base64Data, "base64");

  if (mimeType === "application/pdf") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      log.debug("PDF parseado", { pages: textResult.total, textLength: textResult.text.length });
      await parser.destroy();
      return textResult.text;
    } catch (error) {
      log.error("Error parseando PDF", { error: (error as Error).message });
      throw new Error("No se pudo leer el archivo PDF.");
    }
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      log.debug("Documento Word parseado", { textLength: result.value.length });
      return result.value;
    } catch (error) {
      log.error("Error parseando Word", { error: (error as Error).message });
      throw new Error("No se pudo leer el archivo de Word.");
    }
  }

  if (mimeType.startsWith("text/")) {
    return buffer.toString("utf8");
  }

  throw new Error(`Tipo de archivo no soportado: ${mimeType}`);
}

interface UserPreferences {
  readingLevel: string;
  tone: string;
  highContrast: boolean;
  textToSpeech: boolean;
}

interface SessionUser {
  id?: string;
  email?: string | null;
}

interface Session {
  user?: SessionUser;
}

function getSessionUserId(session: Session | null): string | null {
  return session?.user?.id || session?.user?.email || null;
}

export async function persistMessage(message: AgentMessage) {
  if (!isCosmosConfigured()) return null;

  try {
    const session = await getServerSession();
    const userId = getSessionUserId(session);
    if (!userId) return null;
    return await saveToCosmos(userId, message);
  } catch (error) {
    log.error("Error persistiendo mensaje", { error: (error as Error).message });
    return null;
  }
}

export async function deleteUserMessageLog(messageId: string) {
  if (!isCosmosConfigured()) return;

  try {
    const session = await getServerSession();
    const userId = getSessionUserId(session);
    if (!userId) return;
    await deleteFromCosmos(userId, messageId);
  } catch (error) {
    log.error("Error eliminando mensaje", { error: (error as Error).message });
  }
}

export async function fetchUserHistory() {
  if (!isCosmosConfigured()) return [];

  try {
    const session = await getServerSession();
    const userId = getSessionUserId(session);
    if (!userId) return [];
    return await getHistoryFromCosmos(userId);
  } catch (error) {
    log.error("Error obteniendo historial", { error: (error as Error).message });
    return [];
  }
}

export async function persistPreferences(preferences: UserPreferences) {
  if (!isCosmosConfigured()) return;

  try {
    const session = await getServerSession();
    const userId = getSessionUserId(session);
    if (!userId) return;
    await saveUserPreferences(userId, preferences);
  } catch (error) {
    log.error("Error persistiendo preferencias", { error: (error as Error).message });
  }
}

export async function fetchUserPreferences() {
  if (!isCosmosConfigured()) return null;

  try {
    const session = await getServerSession();
    const userId = getSessionUserId(session);
    if (!userId) return null;
    return await getUserPreferences(userId);
  } catch (error) {
    log.error("Error obteniendo preferencias", { error: (error as Error).message });
    return null;
  }
}

export async function isAzureConfigured() {
  return isAzureAdConfigured();
}
