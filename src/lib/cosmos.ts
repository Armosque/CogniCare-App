import { CosmosClient } from "@azure/cosmos";
import type { AgentMessage } from "./ai-agent";
import { AZURE_COSMOS_ENDPOINT, AZURE_COSMOS_KEY, AZURE_COSMOS_DATABASE_ID } from "./env";
import { log } from "./log";

interface UserPreferences {
  readingLevel: string;
  tone: string;
  highContrast: boolean;
  textToSpeech: boolean;
}

/**
 * Crea un nuevo CosmosClient (sin singleton mutable para cumplir 12-Factor: Processes).
 */
let cosmosClient: CosmosClient | null = null;

// Crea un nuevo CosmosClient o reutiliza el existente
function getCosmosClient(): CosmosClient {
  if (!cosmosClient) {
    const endpoint = AZURE_COSMOS_ENDPOINT();
    const key = AZURE_COSMOS_KEY();
    cosmosClient = new CosmosClient({ endpoint, key });
  }
  return cosmosClient;
}

/**
 * Obtiene un container de Cosmos DB. Crea la DB y container si no existen.
 */
async function getContainer(containerId: string) {
  const client = getCosmosClient();
  const databaseId = AZURE_COSMOS_DATABASE_ID();

  const { database } = await client.databases.createIfNotExists({ id: databaseId });
  const { container } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: ["/userId"] },
  });
  return container;
}

export async function saveMessage(userId: string, message: AgentMessage) {
  try {
    const container = await getContainer("Messages");
    const { resource } = await container.items.create({
      ...message,
      userId,
      timestamp: new Date().toISOString(),
    });
    log.debug("Mensaje guardado", { userId, messageId: resource?.id });
    return resource?.id;
  } catch (error) {
    log.error("Error guardando mensaje en Cosmos DB", { error: (error as Error).message });
    return null;
  }
}

export async function deleteMessage(userId: string, messageId: string) {
  try {
    const container = await getContainer("Messages");
    await container.item(messageId, userId).delete();
    log.debug("Mensaje eliminado", { userId, messageId });
  } catch (error) {
    log.error("Error eliminando mensaje de Cosmos DB", { messageId, error: (error as Error).message });
  }
}

export async function getUserHistory(userId: string) {
  try {
    const container = await getContainer("Messages");
    const { resources } = await container.items
      .query({
        query: "SELECT TOP 50 * from c WHERE c.userId = @userId ORDER BY c.timestamp DESC",
        parameters: [{ name: "@userId", value: userId }],
      })
      .fetchAll();
    return resources.reverse();
  } catch (error) {
    log.error("Error obteniendo historial de Cosmos DB", { error: (error as Error).message });
    return [];
  }
}

export async function saveUserPreferences(userId: string, preferences: UserPreferences) {
  try {
    const container = await getContainer("Users");
    await container.items.upsert({
      id: userId,
      userId,
      preferences,
      updatedAt: new Date().toISOString(),
    });
    log.debug("Preferencias guardadas", { userId });
  } catch (error) {
    log.error("Error guardando preferencias en Cosmos DB", { error: (error as Error).message });
  }
}

export async function getUserPreferences(userId: string) {
  try {
    const container = await getContainer("Users");
    const { resource } = await container.item(userId, userId).read();
    return resource?.preferences || null;
  } catch {
    log.debug("Preferencias no encontradas (usuario nuevo)", { userId });
    return null;
  }
}
