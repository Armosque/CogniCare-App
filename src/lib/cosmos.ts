import { CosmosClient } from "@azure/cosmos";
import type { AgentMessage } from "./ai-agent";

interface UserPreferences {
  readingLevel: string;
  tone: string;
  highContrast: boolean;
  textToSpeech: boolean;
}

const databaseId = process.env.AZURE_COSMOS_DATABASE_ID || "CogniCareDB";

// This client will be initialized only when needed
let client: CosmosClient | null = null;

/**
 * Ensures the database and container exist and returns the container object.
 */
export const getContainer = async (containerId: string) => {
  const endpoint = process.env.AZURE_COSMOS_ENDPOINT;
  const key = process.env.AZURE_COSMOS_KEY;

  if (!endpoint || !key) {
    console.warn("Cosmos DB credentials missing. Persistence will be disabled.");
    throw new Error("Missing Cosmos DB credentials");
  }

  if (!client) {
    client = new CosmosClient({ endpoint, key });
  }

  const { database } = await client.databases.createIfNotExists({ id: databaseId });
  const { container } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: ["/userId"] }
  });
  return container;
};

/**
 * Saves a single chat message to the database.
 */
export async function saveMessage(userId: string, message: AgentMessage) {
  try {
    const container = await getContainer("Messages");
    const { resource } = await container.items.create({
      ...message,
      userId,
      timestamp: new Date().toISOString()
    });
    return resource?.id;
  } catch (error) {
    console.error("Error saving message to Cosmos DB:", error);
    return null;
  }
}

export async function deleteMessage(userId: string, messageId: string) {
  try {
    const container = await getContainer("Messages");
    await container.item(messageId, userId).delete();
  } catch (error) {
    console.error(`Error deleting message ${messageId} from Cosmos DB:`, error);
  }
}

/**
 * Retrieves the last 50 messages for a specific user to maintain context across sessions.
 */
export async function getUserHistory(userId: string) {
  try {
    const container = await getContainer("Messages");
    const { resources } = await container.items
      .query({
        query: "SELECT TOP 50 * from c WHERE c.userId = @userId ORDER BY c.timestamp DESC",
        parameters: [{ name: "@userId", value: userId }]
      })
      .fetchAll();
    // Reverse to get chronological order for the UI
    return resources.reverse();
  } catch (error) {
    console.error("Error fetching history from Cosmos DB:", error);
    return [];
  }
}

/**
 * Upserts (updates or inserts) user accessibility preferences.
 */
export async function saveUserPreferences(userId: string, preferences: UserPreferences) {
  try {
    const container = await getContainer("Users");
    await container.items.upsert({
      id: userId,
      userId, // Partition key
      preferences,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error saving preferences to Cosmos DB:", error);
  }
}

/**
 * Reads user-specific preferences from the database.
 */
export async function getUserPreferences(userId: string) {
  try {
    const container = await getContainer("Users");
    const { resource } = await container.item(userId, userId).read();
    return resource?.preferences || null;
  } catch {
    console.warn("User preferences not found in Cosmos DB (new user?).");
    return null;
  }
}
