"use server"


const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const subdomain = process.env.AZURE_SUBDOMAIN;

export async function getImmersiveReaderToken() {
  console.log("Servidor: Solicitando token de Lector Inmersivo...");
  if (!tenantId || !clientId || !clientSecret || !subdomain) {
    console.error("Servidor: Faltan variables de entorno para el Lector Inmersivo");
    throw new Error("Missing Azure Immersive Reader configuration in .env.local");
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://cognitiveservices.azure.com/.default');
    params.append('grant_type', 'client_credentials');

    const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Servidor: Error de Azure AD:", data);
      throw new Error(`Azure AD Auth Error: ${data.error_description || response.statusText}`);
    }

    console.log("Servidor: Token obtenido con éxito. Subdominio:", subdomain);
    return {
      token: data.access_token,
      subdomain: subdomain,
    };
  } catch (error) {
    console.error("Servidor: Error adquiriendo token:", error);
    throw error;
  }
}
