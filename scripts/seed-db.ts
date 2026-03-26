/**
 * 12-Factor: Admin processes.
 *
 * Script de seed/migración para Cosmos DB.
 * Ejecutar como proceso one-off:
 *
 *   npx tsx scripts/seed-db.ts
 *
 * O en un orquestador:
 *   docker exec <container> node scripts/seed-db.js
 */

import dotenv from 'dotenv';
import { CosmosClient } from "@azure/cosmos";

dotenv.config({ path: '.env.local' });

const endpoint = process.env.AZURE_COSMOS_ENDPOINT;
const key = process.env.AZURE_COSMOS_KEY;
const databaseId = process.env.AZURE_COSMOS_DATABASE_ID || "CogniCareDB";

async function seed() {
  if (!endpoint || !key) {
    console.error("[SEED] Faltan AZURE_COSMOS_ENDPOINT y AZURE_COSMOS_KEY");
    process.exit(1);
  }

  const client = new CosmosClient({ endpoint, key });

  console.log(`[SEED] Creando base de datos: ${databaseId}`);
  const { database } = await client.databases.createIfNotExists({ id: databaseId });

  // Container: Messages (historial de chat)
  console.log("[SEED] Creando container: Messages");
  await database.containers.createIfNotExists({
    id: "Messages",
    partitionKey: { paths: ["/userId"] },
    indexingPolicy: {
      automatic: true,
      indexingMode: "consistent",
      includedPaths: [{ path: "/*" }],
      excludedPaths: [{ path: '/"_etag"/?' }],
    },
  });

  // Container: Users (preferencias)
  console.log("[SEED] Creando container: Users");
  await database.containers.createIfNotExists({
    id: "Users",
    partitionKey: { paths: ["/userId"] },
    indexingPolicy: {
      automatic: true,
      indexingMode: "consistent",
      includedPaths: [{ path: "/*" }],
      excludedPaths: [{ path: '/"_etag"/?' }],
    },
  });

  console.log("[SEED] Base de datos lista.");
  console.log(`[SEED] Database: ${databaseId}`);
  console.log("[SEED] Containers: Messages, Users");

  process.exit(0);
}

seed().catch((err) => {
  console.error("[SEED] Error:", err.message);
  process.exit(1);
});
