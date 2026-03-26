"use server"

import { AZURE_IR_TENANT_ID, AZURE_IR_CLIENT_ID, AZURE_IR_CLIENT_SECRET, AZURE_IR_SUBDOMAIN } from "./env";
import { log } from "./log";

export async function getImmersiveReaderToken() {
  const tenantId = AZURE_IR_TENANT_ID();
  const clientId = AZURE_IR_CLIENT_ID();
  const clientSecret = AZURE_IR_CLIENT_SECRET();
  const subdomain = AZURE_IR_SUBDOMAIN();

  if (!tenantId || !clientId || !clientSecret || !subdomain) {
    throw new Error("Faltan variables de entorno para Azure Immersive Reader");
  }

  try {
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("scope", "https://cognitiveservices.azure.com/.default");
    params.append("grant_type", "client_credentials");

    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      log.error("Error de autenticación Azure AD para Immersive Reader", { error: data.error_description });
      throw new Error(`Azure AD Auth Error: ${data.error_description || response.statusText}`);
    }

    log.debug("Token de Immersive Reader obtenido");
    return { token: data.access_token, subdomain };
  } catch (error) {
    log.error("Error adquiriendo token de Immersive Reader", { error: (error as Error).message });
    throw error;
  }
}
