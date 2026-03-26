/**
 * Validación centralizada de variables de entorno (12-Factor: Config).
 * Todas las env vars se leen aquí. Si falta alguna crítica, la app falla al iniciar.
 */

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`[CONFIG] Variable de entorno requerida faltante: ${key}`);
  }
  return value;
}

function optional(key: string, fallback?: string): string | undefined {
  return process.env[key]?.trim() ?? fallback;
}

// --- Azure AI (Phi-4 / Foundry) ---
export const AZURE_AI_AGENT_KEY = required.bind(null, "AZURE_AI_AGENT_KEY");
export const AZURE_AI_AGENT_ENDPOINT = required.bind(null, "AZURE_AI_AGENT_ENDPOINT");
export const AZURE_AI_DEPLOYMENT_NAME = () => optional("AZURE_AI_DEPLOYMENT_NAME", "Phi-4-multimodal-instruct")!;
export const AZURE_AI_API_VERSION = () => optional("AZURE_AI_API_VERSION", "2024-02-15-preview")!;

// --- Azure Document Intelligence / Vision OCR ---
export const AZURE_DOC_INTEL_ENDPOINT = required.bind(null, "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT");
export const AZURE_DOC_INTEL_KEY = required.bind(null, "AZURE_DOCUMENT_INTELLIGENCE_KEY");

// --- Azure Communication Services (Email) ---
export const AZURE_COMM_CONN_STRING = optional.bind(null, "AZURE_COMMUNICATION_CONNECTION_STRING");
export const AZURE_COMM_SENDER = optional.bind(null, "AZURE_COMMUNICATION_SENDER");

// --- Cosmos DB ---
export const AZURE_COSMOS_ENDPOINT = optional.bind(null, "AZURE_COSMOS_ENDPOINT");
export const AZURE_COSMOS_KEY = optional.bind(null, "AZURE_COSMOS_KEY");
export const AZURE_COSMOS_DATABASE_ID = () => optional("AZURE_COSMOS_DATABASE_ID", "CogniCareDB")!;

// --- NextAuth / Azure AD ---
export const NEXTAUTH_SECRET = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[CONFIG] NEXTAUTH_SECRET es obligatorio en producción");
    }
    console.warn("[CONFIG] NEXTAUTH_SECRET no configurado — usando secret de desarrollo");
    return "dev-secret-only-for-local";
  }
  return secret;
};

export const NEXTAUTH_URL = () => optional("NEXTAUTH_URL", "http://localhost:3000")!;
export const AZURE_AD_CLIENT_ID = optional.bind(null, "AZURE_AD_CLIENT_ID");
export const AZURE_AD_CLIENT_SECRET = optional.bind(null, "AZURE_AD_CLIENT_SECRET");
export const AZURE_AD_TENANT_ID = () => optional("AZURE_AD_TENANT_ID", "common")!;

// --- Azure Immersive Reader ---
export const AZURE_IR_TENANT_ID = optional.bind(null, "AZURE_TENANT_ID");
export const AZURE_IR_CLIENT_ID = optional.bind(null, "AZURE_CLIENT_ID");
export const AZURE_IR_CLIENT_SECRET = optional.bind(null, "AZURE_CLIENT_SECRET");
export const AZURE_IR_SUBDOMAIN = optional.bind(null, "AZURE_SUBDOMAIN");

// --- App ---
export const APP_PORT = () => parseInt(optional("PORT", "3000")!, 10);
export const NODE_ENV = () => process.env.NODE_ENV ?? "development";
export const LOG_LEVEL = () => optional("LOG_LEVEL", NODE_ENV() === "production" ? "info" : "debug")!;

/**
 * Verifica si Azure AD está configurado (para el botón de login).
 */
export function isAzureAdConfigured(): boolean {
  return !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID);
}

/**
 * Verifica si Cosmos DB está configurado (para persistencia).
 */
export function isCosmosConfigured(): boolean {
  return !!(process.env.AZURE_COSMOS_ENDPOINT && process.env.AZURE_COSMOS_KEY);
}

/**
 * Verifica si Azure Communication está configurado (para emails).
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.AZURE_COMMUNICATION_CONNECTION_STRING && process.env.AZURE_COMMUNICATION_SENDER);
}
