"use server"

import DocumentIntelligence, { isUnexpected } from "@azure-rest/ai-document-intelligence";
import ImageAnalysisClient from "@azure-rest/ai-vision-image-analysis";
import { AZURE_DOC_INTEL_ENDPOINT, AZURE_DOC_INTEL_KEY } from "./env";
import { log } from "./log";

const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 30;

/**
 * Extrae texto de una imagen usando Azure AI Vision (OCR).
 */
export async function extractTextFromImage(base64Image: string): Promise<string> {
  const endpoint = AZURE_DOC_INTEL_ENDPOINT();
  const key = AZURE_DOC_INTEL_KEY();

  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  try {
    const client = ImageAnalysisClient(endpoint.trim(), { key: key.trim() });

    const result = await client.path("/imageanalysis:analyze").post({
      body: buffer,
      queryParameters: { features: ["read", "caption"], language: "es" },
      contentType: "application/octet-stream",
    });

    if (isUnexpected(result)) {
      throw result.body.error;
    }

    interface TextLine { text: string }
    interface TextBlock { lines?: TextLine[] }
    interface ReadResult { blocks?: TextBlock[] }
    interface ImageAnalysisBody { readResult?: ReadResult; captionResult?: { text?: string } }

    const body = result.body as unknown as ImageAnalysisBody;
    const readResult = body.readResult;
    const caption = body.captionResult?.text || "";

    if (!readResult) return caption;

    const text = (readResult.blocks || [])
      .flatMap((block) => (block.lines || []).map((line) => line.text))
      .join("\n");

    log.info("OCR completado", { textLength: text.length });
    return `[CAPTURA]: ${caption}\n\n[TEXTO DETECTADO]:\n${text}`;
  } catch (error) {
    log.error("Error en OCR Vision", { error: (error as Error).message });
    return "No se pudo extraer el texto de la imagen.";
  }
}

/**
 * Analiza un documento complejo usando Azure Document Intelligence.
 * Tiene un límite de intentos de polling para evitar loops infinitos (12-Factor: Disposability).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function analyzeComplexDocument(base64Data: string, mimeType: string): Promise<string> {
  const endpoint = AZURE_DOC_INTEL_ENDPOINT();
  const key = AZURE_DOC_INTEL_KEY();

  const pureBase64 = base64Data.replace(/^data:[\w\/]+;base64,/, "");
  const buffer = Buffer.from(pureBase64, "base64");

  try {
    const client = DocumentIntelligence(endpoint.trim(), { key: key.trim() });
    const modelId = "prebuilt-layout";

    const initialResponse = await client.path("/documentModels/{modelId}:analyze", modelId).post({
      contentType: "application/octet-stream",
      body: buffer,
      queryParameters: { locale: "es", features: ["formulas", "styleFont"] },
    });

    if (isUnexpected(initialResponse)) {
      throw initialResponse.body.error;
    }

    const operationLocation = initialResponse.headers["operation-location"];
    if (!operationLocation) {
      throw new Error("No se recibió la ubicación de la operación de análisis.");
    }

    interface AnalyzeResult {
      content?: string;
      tables?: unknown[];
    }
    interface PollResponseBody {
      status: string;
      analyzeResult?: AnalyzeResult;
    }

    // Polling con límite de intentos
    let result: AnalyzeResult | undefined;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const getResponse = await client
        .path(
          "/documentModels/{modelId}/analyzeResults/{resultId}",
          modelId,
          operationLocation.split("/").pop()!
        )
        .get();

      if (isUnexpected(getResponse)) throw getResponse.body.error;

      const responseBody = getResponse.body as PollResponseBody;
      const status = responseBody.status;

      if (status === "succeeded") {
        result = responseBody.analyzeResult;
        break;
      }
      if (status === "failed") throw new Error("Análisis de documento fallido.");

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    if (!result) {
      log.warn("Document Intelligence: timeout de polling alcanzado");
      return "El análisis del documento tardó demasiado. Intenta con un archivo más pequeño.";
    }

    const content = result.content || "";
    const tablesCount = result.tables?.length || 0;
    const additionalInfo = tablesCount > 0 ? `\n\n[INFO]: Se detectaron ${tablesCount} tablas en el documento.` : "";

    log.info("Documento analizado", { contentLength: content.length, tables: tablesCount });
    return `${content}${additionalInfo}`;
  } catch (error) {
    log.error("Error en Document Intelligence", { error: (error as Error).message });
    return "Error al analizar la estructura del documento.";
  }
}
