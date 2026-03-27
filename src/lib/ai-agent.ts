"use server"

import { AZURE_AI_AGENT_KEY, AZURE_AI_AGENT_ENDPOINT, AZURE_AI_DEPLOYMENT_NAME, AZURE_AI_API_VERSION } from "./env";
import { parseAgentResponse } from "./agent-response";
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
  synthesis?: string;
}

interface ApiMessagePartText {
  type: "text";
  text: string;
}

interface ApiMessagePartImage {
  type: "image_url";
  image_url: { url: string };
}

type ApiMessageContent = string | Array<ApiMessagePartText | ApiMessagePartImage>;

interface ApiMessage {
  role: AgentMessage["role"];
  content: ApiMessageContent;
}

export interface AgentDiagnostics {
  requestTimeoutMs: number;
  hasAttachment: boolean;
  input: {
    messageCount: number;
    latestUserContentPreview: string;
    documentLength: number;
    imageAttached: boolean;
  };
  preprocessing: {
    compactedDocumentLength: number;
    compactedDocumentPreview: string;
  };
  request: {
    messageCount: number;
    lastMessagePreview: string;
    systemPromptPreview: string;
    maxTokens: number;
  };
  rawResponse?: {
    contentLength: number;
    contentPreview: string;
  };
  parsed?: {
    type: AgentMessage["type"] | "text";
    contentPreview: string;
    stepsCount: number;
    stepTitles: string[];
  };
  checks: {
    hasSynthesis: boolean;
    hasExplanation: boolean;
    hasThreeTasks: boolean;
    looksTruncated: boolean;
  };
  issues: string[];
}

const REQUEST_TIMEOUT_MS = 90000;
const MAX_DOCUMENT_CHARS = 8000;

function buildReadingLevelInstructions(level: string): string {
  const map: Record<string, string> = {
    simple: "Usa palabras basicas, frases cortas y explicaciones faciles de seguir.",
    intermedio: "Usa un lenguaje claro y directo, con algo mas de detalle cuando ayude.",
    avanzado: "Usa lenguaje preciso y completo, explicando los terminos tecnicos si aparecen.",
  };
  return map[level] ?? map.simple;
}

function buildToneInstructions(tone: string): string {
  const map: Record<string, string> = {
    motivador: "Se positivo, cercano y orientado a la accion.",
    directo: "Se breve, claro y enfocado en lo esencial.",
    empatico: "Se tranquilo, paciente y reduce la ansiedad del usuario.",
  };
  return map[tone] ?? map.motivador;
}

function buildSystemPrompt(readingLevel: string, tone: string): string {
  const levelInstr = buildReadingLevelInstructions(readingLevel);
  const toneInstr = buildToneInstructions(tone);

  return `Eres CogniCare, un asistente que simplifica informacion para personas neurodiversas.

Responde siempre en espanol.
Nivel de lectura: ${levelInstr}
Tono: ${toneInstr}

Si el usuario comparte un documento o una imagen:
1. Haz una sintesis breve y fiel del contenido.
2. Explica el contenido con lenguaje claro y ordenado.
3. Crea tres tareas concretas para repasar y afianzar lo aprendido.
4. No inventes datos que no esten en el material.
5. No uses JSON ni bloques de codigo.

Devuelve la respuesta exactamente con este formato:

SINTESIS:
[texto breve]

EXPLICACION:
[explicacion sencilla]

TAREAS:
1. [tarea 1]
2. [tarea 2]
3. [tarea 3]

  Si no hay material adjunto y solo es una pregunta normal, responde de forma directa y clara.`;
}

function compactDocumentText(documentText: string): string {
  const cleanDoc = documentText
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[^\x20-\x7E\u00C0-\u00FF\u0100-\u017F]/g, "")
    .trim();

  if (cleanDoc.length <= MAX_DOCUMENT_CHARS) return cleanDoc;

  const headSize = Math.floor(MAX_DOCUMENT_CHARS * 0.5);
  const tailSize = Math.floor(MAX_DOCUMENT_CHARS * 0.3);
  const middleSize = MAX_DOCUMENT_CHARS - headSize - tailSize;
  const middleStart = Math.max(Math.floor((cleanDoc.length - middleSize) / 2), headSize);
  const middleEnd = middleStart + middleSize;

  const head = cleanDoc.slice(0, headSize).trim();
  const middle = cleanDoc.slice(middleStart, middleEnd).trim();
  const tail = cleanDoc.slice(-tailSize).trim();

  return [
    "Inicio del documento:",
    head,
    "[Contenido intermedio resumido para acelerar el analisis]",
    middle,
    "Final del documento:",
    tail,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildContextHistory(history: AgentMessage[]): ApiMessage[] {
  const validHistory = history.filter((msg) =>
    (msg.content && msg.content.trim()) || msg.image || (msg.documentText && msg.documentText.trim())
  );

  const lastImageIndex = validHistory.findLastIndex((msg) => msg.image);
  const recentHistory = validHistory.slice(-6);

  return recentHistory.map((msg, idx) => {
    const compactDoc = msg.documentText ? compactDocumentText(msg.documentText) : "";
    let combinedContent = msg.content || "";

    if (compactDoc) {
      combinedContent = `Documento:\n${compactDoc}\n\nPregunta:\n${msg.content || "Analiza este documento"}`;
    }

    if (msg.role === "user") {
      if (msg.image && idx === lastImageIndex) {
        return {
          role: "user",
          content: [
            { type: "text", text: combinedContent || "Analiza esta imagen" },
            { type: "image_url", image_url: { url: msg.image } },
          ],
        };
      }

      return { role: "user", content: combinedContent || "Por favor, ayudame con esto" };
    }

    return {
      role: msg.role,
      content: msg.content ? msg.content.replace(/[\r\n\t]+/g, " ").trim() : "",
    };
  });
}

function buildRequestMessages(history: AgentMessage[]): ApiMessage[] {
  const latestUserMessage = [...history].reverse().find((message) => message.role === "user");
  const hasAttachment = Boolean(latestUserMessage?.documentText || latestUserMessage?.image);

  if (latestUserMessage && hasAttachment) {
    return buildContextHistory([latestUserMessage]);
  }

  return buildContextHistory(history);
}

async function callApi(
  url: string,
  agentKey: string,
  deploymentId: string,
  bodyJson: { messages?: ApiMessage[]; [key: string]: unknown }
) {
  log.warn(`[CogniCare] Llamando a endpoint: ${url.split("?")[0]}`);
  log.warn(`[CogniCare] Modelo: ${deploymentId}`);
  log.warn(`[CogniCare] Mensajes en contexto: ${bodyJson.messages?.length || 0}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": agentKey,
      },
      body: JSON.stringify(bodyJson),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`[CogniCare] Error de Azure (${response.status}):`, {
        detail: errorText.slice(0, 500),
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`La solicitud excedio el tiempo limite de ${Math.round(REQUEST_TIMEOUT_MS / 1000)} segundos. Por favor, intenta con un documento mas corto.`);
    }
    throw error;
  }
}

export async function diagnoseAgentPipeline(
  history: AgentMessage[],
  readingLevel: string = "simple",
  tone: string = "motivador"
): Promise<AgentDiagnostics> {
  const key = AZURE_AI_AGENT_KEY();
  const endpoint = AZURE_AI_AGENT_ENDPOINT();
  const deployment = AZURE_AI_DEPLOYMENT_NAME();
  AZURE_AI_API_VERSION();

  const latestUserMessage = [...history].reverse().find((message) => message.role === "user");
  const hasAttachment = Boolean(latestUserMessage?.documentText || latestUserMessage?.image);
  const compactedDocument = latestUserMessage?.documentText ? compactDocumentText(latestUserMessage.documentText) : "";
  const systemPrompt = buildSystemPrompt(readingLevel, tone);
  const messages = buildRequestMessages(history);
  const requestMessages = [{ role: "system" as const, content: systemPrompt }, ...messages];
  const body = {
    model: deployment,
    messages: requestMessages,
    temperature: 0.2,
    top_p: 0.95,
    max_tokens: 1200,
    stream: false,
  };
  const lastRequestContent = requestMessages[requestMessages.length - 1]?.content;

  const diagnostics: AgentDiagnostics = {
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    hasAttachment,
    input: {
      messageCount: history.length,
      latestUserContentPreview: (latestUserMessage?.content || "").slice(0, 220),
      documentLength: latestUserMessage?.documentText?.length || 0,
      imageAttached: Boolean(latestUserMessage?.image),
    },
    preprocessing: {
      compactedDocumentLength: compactedDocument.length,
      compactedDocumentPreview: compactedDocument.slice(0, 500),
    },
    request: {
      messageCount: requestMessages.length,
      lastMessagePreview: typeof lastRequestContent === "string" ? lastRequestContent.slice(0, 500) : "[multimodal]",
      systemPromptPreview: systemPrompt.slice(0, 500),
      maxTokens: body.max_tokens,
    },
    checks: {
      hasSynthesis: false,
      hasExplanation: false,
      hasThreeTasks: false,
      looksTruncated: false,
    },
    issues: [],
  };

  try {
    const res = await callApi(endpoint, key, deployment, body);
    const data = await res.json();
    const fullContent = String(data.choices?.[0]?.message?.content || "");
    const parsed = parseAgentResponse(fullContent, {
      requireStructuredSections: hasAttachment,
      requireTasks: hasAttachment,
    });

    const contentUpper = parsed.content.toUpperCase();
    const looksTruncated = /(^|\s)(la foto|piensa en la foto|describe la foto|hacer foto)\b/i.test(fullContent)
      || (parsed.steps?.length || 0) < 3;

    diagnostics.rawResponse = {
      contentLength: fullContent.length,
      contentPreview: fullContent.slice(0, 800),
    };
    diagnostics.parsed = {
      type: parsed.type || "text",
      contentPreview: parsed.content.slice(0, 800),
      stepsCount: parsed.steps?.length || 0,
      stepTitles: parsed.steps?.map((step) => step.title) || [],
    };
    diagnostics.checks = {
      hasSynthesis: contentUpper.includes("SINTESIS"),
      hasExplanation: contentUpper.includes("EXPLICACION"),
      hasThreeTasks: (parsed.steps?.length || 0) >= 3,
      looksTruncated,
    };

    if (!diagnostics.checks.hasSynthesis) diagnostics.issues.push("La respuesta final no contiene una sintesis identificable.");
    if (!diagnostics.checks.hasExplanation) diagnostics.issues.push("La respuesta final no contiene una explicacion identificable.");
    if (!diagnostics.checks.hasThreeTasks) diagnostics.issues.push("El agente no devolvio tres tareas separadas.");
    if (diagnostics.checks.looksTruncated) diagnostics.issues.push("La salida parece truncada o demasiado generica para el documento enviado.");
  } catch (error) {
    diagnostics.issues.push((error as Error).message);
  }

  return diagnostics;
}

function mask(str: string | undefined) {
  if (!str) return "N/D";
  if (str.length < 10) return "****";
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

function previewMessageContent(content: ApiMessageContent, maxLength: number = 160): string {
  if (typeof content === "string") return content.slice(0, maxLength);
  return content
    .map((part) => (part.type === "text" ? part.text : "[image]"))
    .join(" ")
    .slice(0, maxLength);
}

function buildTransparencyExplanation(
  latestUserMessage: AgentMessage | undefined,
  parsed: AgentMessage,
  readingLevel: string,
  tone: string
): string {
  const evidence: string[] = [];
  const limits: string[] = [];
  const criteria: string[] = [];
  const synthesis = parsed.synthesis?.trim() || "";
  const explanation = parsed.explanation?.trim() || "";
  const steps = parsed.steps || [];

  if (latestUserMessage?.documentText) {
    criteria.push("Tomé como base el texto extraído del documento adjunto, no conocimiento externo.");
    evidence.push(`Prioricé las ideas que aparecían con más peso en el documento, por ejemplo: "${latestUserMessage.documentText.slice(0, 140).trim()}..."`);
    limits.push("Si el texto extraído del documento tenía cortes, ruido u OCR imperfecto, eso puede afectar la precisión.");
  } else if (latestUserMessage?.image) {
    criteria.push("Tomé como base la imagen adjunta y la descripción que el modelo pudo inferir de ella.");
    limits.push("Si la imagen era borrosa, parcial o con poco contraste, la interpretación puede perder detalle.");
  } else {
    criteria.push("Tomé como base la pregunta del usuario y respondí sin añadir pasos de documento o imagen.");
  }

  criteria.push(`Ajusté el lenguaje al nivel "${readingLevel}" y al tono "${tone}".`);

  if (synthesis) {
    evidence.push(`La síntesis se eligió para condensar la idea principal en una frase breve: "${synthesis.slice(0, 180)}"`);
  }

  if (explanation) {
    evidence.push(`La explicación se simplificó para que el contenido fuera más fácil de seguir: "${explanation.slice(0, 180)}"`);
  }

  if (steps.length > 0) {
    evidence.push(`Las tareas se generaron a partir de los conceptos más importantes detectados en la respuesta: ${steps.map((step) => step.title).slice(0, 3).join("; ")}.`);
    criteria.push("Elegí tareas de repaso porque ayudan a comprobar comprensión, reformulación y aplicación.");
  }

  limits.push("No puedo garantizar intención exacta del autor; solo trabajo con el contenido recibido.");
  limits.push("Si el documento es muy largo, primero se compacta para acelerar el análisis.");

  const sections = [
    "### Como llegue a esta respuesta",
    "",
    "#### Criterios usados",
    ...criteria.map((item) => `- ${item}`),
    "",
    "#### Por que no elegi otra respuesta",
    ...evidence.map((item) => `- ${item}`),
    "",
    "#### Limites y precauciones",
    ...limits.map((item) => `- ${item}`),
  ];

  return sections.join("\n").trim();
}

export async function processWithAgent(
  history: AgentMessage[],
  readingLevel: string = "simple",
  tone: string = "motivador"
): Promise<AgentMessage> {
  const key = AZURE_AI_AGENT_KEY();
  const endpoint = AZURE_AI_AGENT_ENDPOINT();
  const deployment = AZURE_AI_DEPLOYMENT_NAME();
  AZURE_AI_API_VERSION();
  const systemPrompt = buildSystemPrompt(readingLevel, tone);

  log.warn("--- [CogniCare] Configuracion Activa ---");
  log.warn(`URL: ${endpoint?.split("?")[0] || "No definida"}`);
  log.warn(`Modelo: ${deployment || "No definido"}`);
  log.warn(`API Key: ${mask(key)}`);
  log.warn(`Nivel de lectura: ${readingLevel}`);
  log.warn(`Tono: ${tone}`);
  log.warn("---------------------------------------");

  try {
    const latestUserMessage = [...history].reverse().find((message) => message.role === "user");
    const requireStructuredSections = Boolean(latestUserMessage?.documentText || latestUserMessage?.image);
    const compactedDocument = latestUserMessage?.documentText ? compactDocumentText(latestUserMessage.documentText) : "";

    log.info("[Pipeline 1/5] Entrada recibida", {
      hasAttachment: requireStructuredSections,
      historyCount: history.length,
      latestUserPreview: (latestUserMessage?.content || "").slice(0, 180),
      documentLength: latestUserMessage?.documentText?.length || 0,
      imageAttached: Boolean(latestUserMessage?.image),
    });

    if (requireStructuredSections) {
      log.info("[Pipeline 2/5] Documento preprocesado", {
        compactedDocumentLength: compactedDocument.length,
        compactedPreview: compactedDocument.slice(0, 240),
      });
    }

    const messages = buildRequestMessages(history);
    messages.unshift({ role: "system", content: systemPrompt });

    log.info("[Pipeline 3/5] Payload preparado para Azure", {
      count: messages.length,
      systemPromptLength: systemPrompt.length,
      lastUserMsg: previewMessageContent(messages.slice(-1)[0]?.content || "", 240),
      usesAttachmentOnlyContext: requireStructuredSections,
    });

    const body = {
      model: deployment,
      messages,
      temperature: 0.2,
      top_p: 0.95,
      max_tokens: 1200,
      stream: false,
    };

    const res = await callApi(endpoint, key, deployment, body);
    const data = await res.json();
    const fullContent = data.choices?.[0]?.message?.content || "";

    log.info("[Pipeline 4/5] Respuesta cruda del modelo", {
      length: fullContent.length,
      snippet: String(fullContent).slice(0, 300),
    });

    if (!fullContent || !String(fullContent).trim()) {
      log.error("[Pipeline 5/5] Respuesta vacia", {
        reason: "Azure devolvio contenido vacio o solo espacios",
      });
      return {
        role: "assistant",
        content: "No recibi una respuesta valida. Por favor, intenta de nuevo.",
        type: "text",
      };
    }

    const parsed = parseAgentResponse(String(fullContent), {
      requireStructuredSections,
      requireTasks: requireStructuredSections,
    });
    parsed.explanation = buildTransparencyExplanation(latestUserMessage, parsed, readingLevel, tone);

    log.info("[Pipeline 5/5] Respuesta parseada", {
      type: parsed.type || "text",
      contentPreview: parsed.content.slice(0, 240),
      stepsCount: parsed.steps?.length || 0,
      stepTitles: parsed.steps?.map((step) => step.title).slice(0, 3) || [],
    });

    return parsed;
  } catch (error) {
    const errorMsg = (error as Error).message;
    log.error("Error en processWithAgent:", {
      msg: errorMsg,
      stack: (error as Error).stack,
    });

    let friendlyError = "Lo siento, tu agente CogniCare experimento un problema tecnico. ";
    if (errorMsg.includes("timeout") || errorMsg.includes(`${Math.round(REQUEST_TIMEOUT_MS / 1000)} segundos`)) {
      friendlyError += "El documento era muy grande o la solicitud demoro demasiado. Intenta con un documento mas corto o fragmenta la informacion.";
    } else if (errorMsg.includes("401") || errorMsg.includes("403")) {
      friendlyError += "Hay un problema de autenticacion con el servicio. Por favor, contacta al administrador.";
    } else if (errorMsg.includes("429")) {
      friendlyError += "Hay demasiadas solicitudes. Espera unos segundos y vuelve a intentar.";
    } else {
      friendlyError += "Por favor, refresca la pagina e intenta de nuevo. Si el problema persiste, contacta a soporte.";
    }

    return {
      role: "assistant",
      content: friendlyError,
      type: "text",
    };
  }
}
