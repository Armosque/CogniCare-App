"use server"

import { AZURE_AI_AGENT_KEY, AZURE_AI_AGENT_ENDPOINT, AZURE_AI_DEPLOYMENT_NAME, AZURE_AI_API_VERSION } from "./env";
import { log } from "./log";

export interface AgentMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  image?: string;
  documentText?: string;
  type?: "text" | "task-list" | "summary";
  steps?: { title: string; duration?: string; bullets?: string[] }[];
  explanation?: string;
}

interface StepItem {
  title: string;
  duration?: string;
  bullets?: string[];
}

function buildReadingLevelInstructions(level: string): string {
  const map: Record<string, string> = {
    simple: "Usa palabras muy básicas, frases cortas de máximo 10 o 15 palabras. Evita totalmente tecnicismos, modismos complejos o metáforas.",
    intermedio: "Usa un lenguaje claro y directo, para uso general, sin jerga excesiva.",
    avanzado: "Usa lenguaje estándar, fluido y detallado, incorporando términos técnicos si es apropiado.",
  };
  return map[level] ?? map.simple;
}

function buildToneInstructions(tone: string): string {
  const map: Record<string, string> = {
    motivador: "Sé extremadamente entusiasta y elogia el esfuerzo del usuario con palabras de apoyo.",
    directo: "Sé muy conciso, lógico, y al grano. Evita adornos innecesarios. No uses emojis emocionales y enfócate únicamente en resolver la solicitud.",
    empatico: "Sé muy empático, tranquilo, paciente, comprensivo y utiliza un tono relajante, validando los sentimientos del usuario.",
  };
  return map[tone] ?? map.motivador;
}

function buildSystemPrompt(readingLevel: string, tone: string): string {
  return `
Eres CogniCare, un asistente diseñado estrictamente para reducir la carga cognitiva de personas neurodiversas (TDAH, Autismo, Dislexia).

REGLA DE IDIOMA - CRÍTICA:
1. Detecta el idioma del mensaje del usuario.
2. DEBES RESPONDER COMPLETAMENTE EN ESE MISMO IDIOMA.

INSTRUCCIONES:
- Nivel de lectura: ${buildReadingLevelInstructions(readingLevel)}
- Tono: ${buildToneInstructions(tone)}
- REGLAS: NO USES EMOJIS bajo ninguna circunstancia.

ESTRUCTURA DE RESPUESTA:
(Usa texto claro y negritas, NO uses signos de numeral # para los encabezados)

Síntesis del tema:
(Resumen breve)

Explicación detallada:
(Explicación clara y con párrafos cortos)

PASOS (BLOQUE JSON) - OBLIGATORIO:
Si hay una tarea o proceso, incluye este bloque JSON EXACTAMENTE así al final:
[JSON_START]
{
  "type": "task-list",
  "steps": [
    { "title": "Paso 1", "bullets": ["detalle"], "duration": "5 min" }
  ]
}
[JSON_END]

JUSTIFICACIÓN:
[EXPLICACION_START]
(Breve justificación de la respuesta)
[EXPLICACION_END]
  `;
}

function buildContextHistory(history: AgentMessage[]) {
  const lastImageIndex = history.findLastIndex((m) => m.image);

  return history
    .map((msg, idx) => {
      const truncatedDoc = msg.documentText
        ? msg.documentText.slice(0, 12000) + (msg.documentText.length > 12000 ? "... [Truncado por brevedad]" : "")
        : "";

      const combinedContent = msg.documentText
        ? `[SOURCE DOCUMENT (RESUMIDO)]:\n${truncatedDoc}\n\n[USER QUERY]:\n${msg.content}`
        : msg.content;

      if (msg.image && msg.role === "user" && idx === lastImageIndex) {
        return {
          role: "user",
          content: [
            { type: "text", text: combinedContent },
            { type: "image_url", image_url: { url: msg.image } },
          ],
        };
      }

      return { role: msg.role, content: combinedContent };
    })
    .slice(-6);
}

function buildUrl(endpoint: string, deploymentId: string, apiVersion: string): string {
  let url = endpoint.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Si el endpoint ya incluye todo el path (como en AI Foundry), úsalo tal cual o asegúrate de que tenga api-version
  if (url.includes("/chat/completions")) {
    if (!url.includes("api-version=") && apiVersion) {
      return url.includes("?") ? `${url}&api-version=${apiVersion}` : `${url}?api-version=${apiVersion}`;
    }
    return url;
  }

  // Azure OpenAI Standard
  if (url.includes("openai.azure.com")) {
    return `${url.replace(/\/$/, "")}/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`;
  }

  // Fallback estándar
  return `${url.replace(/\/$/, "")}/v1/chat/completions`;
}

function extractJsonFromContent(content: string): { jsonPart: string; extractedContent: string } {
  const explicitRegex = /\[JSON[_\s](?:START|INICIO|BEGIN)\]\s*(?:```json)?([\s\S]*?)(?:```)?\s*\[JSON[_\s](?:END|FIN|TERMINO|ENLACE)\]/i;
  const mdRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;

  const explicitMatch = content.match(explicitRegex);
  if (explicitMatch) {
    return { jsonPart: explicitMatch[1].trim(), extractedContent: content.replace(explicitRegex, "").trim() };
  }

  const mdMatch = content.match(mdRegex);
  if (mdMatch) {
    const jsonStr = mdMatch[1].trim();
    if (jsonStr.includes('"steps"')) {
      return { jsonPart: jsonStr, extractedContent: content.replace(mdMatch[0], "").trim() };
    }
  }

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start && content.includes('"steps"')) {
    const jsonPart = content.substring(start, end + 1);
    // Verificamos que sea un JSON razonablemente válido antes de mutilar el contenido
    if (jsonPart.includes('"type"') || jsonPart.includes('"title"')) {
       return { jsonPart, extractedContent: content.replace(jsonPart, "").trim() };
    }
  }

  return { jsonPart: "", extractedContent: content };
}

function extractExplanation(content: string): { explanation: string; cleanedContent: string } {
  const explanationRegex = /\[EXPLICACI[ÓO]N[_\s](?:START|INICIO|BEGIN)\]\s*([\s\S]*?)\s*\[EXPLICACI[ÓO]N[_\s](?:END|ENLACE|FIN|TERMINO)\]/i;
  const match = content.match(explanationRegex);
  if (match) {
    return {
      explanation: match[1].trim(),
      cleanedContent: content.replace(explanationRegex, "").trim(),
    };
  }
  return { explanation: "", cleanedContent: content };
}

function cleanFinalContent(raw: string, explanationRegex: RegExp): string {
  let clean = raw
    .replace(explanationRegex, "")
    .replace(/\[(?:JSON|EXPLICACION|EXPLICACI[ÓO]N)[_\s](?:START|END|INICIO|FIN|TERMINO|BEGIN)\]/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Anti-hallucination: strip preamble before mandatory markers
  const startMarkers = ["Explicación detallada:", "Síntesis del tema:", "Síntesis del tema", "Explicación detallada"];
  let firstMarkerIdx = -1;
  for (const marker of startMarkers) {
    const idx = clean.indexOf(marker);
    if (idx !== -1 && (firstMarkerIdx === -1 || idx < firstMarkerIdx)) {
      firstMarkerIdx = idx;
    }
  }
  if (firstMarkerIdx > 0 && firstMarkerIdx < 600) {
    clean = clean.substring(firstMarkerIdx);
  }

  // Strip accidental wrapping brackets
  if (clean.startsWith("[") && clean.endsWith("]") && !clean.includes("\n")) {
    clean = clean.substring(1, clean.length - 1).trim();
  }
  if (clean === "[" || clean === "]") clean = "";

  return clean;
}

function buildTextOnlyHistory(history: AgentMessage[]) {
  return history
    .map((msg) => {
      const truncatedDoc = msg.documentText
        ? msg.documentText.slice(0, 12000) + (msg.documentText.length > 12000 ? "... [Truncado por brevedad]" : "")
        : "";

      const combinedContent = msg.documentText
        ? `[SOURCE DOCUMENT (RESUMIDO)]:\n${truncatedDoc}\n\n[USER QUERY]:\n${msg.content}`
        : msg.content;

      return { role: msg.role, content: combinedContent };
    })
    .slice(-6);
}

function hasImageInHistory(history: AgentMessage[]): boolean {
  return history.some((m) => m.image);
}

function parseAgentResponse(rawContent: string) {
  const explanationRegex = /\[EXPLICACI[ÓO]N[_\s](?:START|INICIO|BEGIN)\]\s*([\s\S]*?)\s*\[EXPLICACI[ÓO]N[_\s](?:END|ENLACE|FIN|TERMINO)\]/i;

  const { jsonPart, extractedContent } = extractJsonFromContent(rawContent);
  const { explanation, cleanedContent } = extractExplanation(extractedContent);

  let type: "text" | "task-list" | "summary" = "text";
  let steps: StepItem[] = [];
  let cleanContent = cleanedContent;

  if (jsonPart) {
    try {
      const parsed = JSON.parse(jsonPart);
      if (parsed.steps && Array.isArray(parsed.steps)) {
        type = "task-list";
        steps = parsed.steps;
      }
    } catch {
      log.warn("Error al parsear JSON de steps de AI");
    }
  }

  cleanContent = cleanFinalContent(cleanContent, explanationRegex);

  return {
    role: "assistant" as const,
    content: (cleanContent || "He aquí los pasos para tu tarea:").trim(),
    type,
    steps: steps.length > 0 ? steps : undefined,
    explanation: explanation || undefined,
  };
}

async function callApi(url: string, agentKey: string, messages: unknown[]) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 segundos

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": agentKey,
      },
      body: JSON.stringify({
        model: AZURE_AI_DEPLOYMENT_NAME(),
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
      signal: controller.signal as any,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function processWithAgent(
  history: AgentMessage[],
  readingLevel: string = "simple",
  tone: string = "motivador"
): Promise<AgentMessage> {
  const agentKey = AZURE_AI_AGENT_KEY();
  const endpoint = AZURE_AI_AGENT_ENDPOINT();
  const deploymentId = AZURE_AI_DEPLOYMENT_NAME();
  const apiVersion = AZURE_AI_API_VERSION();
  const systemPrompt = buildSystemPrompt(readingLevel, tone);
  const url = buildUrl(endpoint, deploymentId, apiVersion);

  log.info("Llamando a AI Agent", { url: url.replace(agentKey, "***"), historyLength: history.length });

  try {
    // Primer intento: con imagen (multimodal)
    const contextWithImage = buildContextHistory(history);
    let response = await callApi(url, agentKey, [
      { role: "system", content: systemPrompt },
      ...contextWithImage,
    ]);

    // Si la API rechaza la imagen, reintentar con solo texto (OCR ya extrajo el contenido)
    if (!response.ok) {
      let errBody = "";
      try {
        errBody = JSON.stringify(await response.json());
      } catch {
        errBody = response.statusText;
      }

      const imageUnsupported =
        errBody.toLowerCase().includes("image") ||
        errBody.toLowerCase().includes("clipboard") ||
        errBody.toLowerCase().includes("multimodal");

      if (imageUnsupported && hasImageInHistory(history)) {
        log.warn("Endpoint no soporta imagen, reintentando con texto OCR solamente");
        const textOnlyHistory = buildTextOnlyHistory(history);
        response = await callApi(url, agentKey, [
          { role: "system", content: systemPrompt },
          ...textOnlyHistory,
        ]);
      }

      if (!response.ok) {
        let retryErr = "";
        try {
          retryErr = JSON.stringify(await response.json());
        } catch {
          retryErr = response.statusText;
        }
        log.error("Error de Azure AI API", { status: response.status, details: retryErr });
        throw new Error(`Azure API Error (${response.status}): ${retryErr}`);
      }
    }

    const data = await response.json();
    const choice = data.choices && data.choices[0] ? data.choices[0] : {};
    const content = (choice.message && choice.message.content) ? choice.message.content : "";

    log.debug("Raw AI Response", { 
      contentLength: content.length,
      contentSnippet: content.slice(0, 500),
      finishReason: choice.finish_reason,
      usage: data.usage
    });
    
    log.info("Respuesta de AI procesada");
    return parseAgentResponse(content);
  } catch (error) {
    log.error("Error en processWithAgent", { error: (error as Error).message });
    return {
      role: "assistant",
      content: `Lo siento, tuve un problema al conectar con mi cerebro artificial. ¿Podrías intentar de nuevo?`,
      type: "text",
    };
  }
}
