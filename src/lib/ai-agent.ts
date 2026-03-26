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
    simple: "Usa palabras muy básicas, frases cortas. Evita tecnicismos.",
    intermedio: "Usa un lenguaje claro y directo para uso general.",
    avanzado: "Usa lenguaje estándar, fluido y detallado.",
  };
  return map[level] ?? map.simple;
}

function buildToneInstructions(tone: string): string {
  const map: Record<string, string> = {
    motivador: "Sé entusiasta y elogia el esfuerzo del usuario.",
    directo: "Sé muy conciso y al grano. Evita adornos.",
    empatico: "Sé compasivo y paciente con el usuario.",
  };
  return map[tone] ?? map.motivador;
}

function buildSystemPrompt(readingLevel: string, tone: string): string {
  const levelInstr = buildReadingLevelInstructions(readingLevel);
  const toneInstr = buildToneInstructions(tone);
  
  return `ERES COGNICARE, UN ASISTENTE AMABLE Y FACILITADOR DE CONOCIMIENTO, ESPECIALIZADO EN NEURODIVERSIDAD (TDAH, TEA, DISLEXIA).
TU OBJETIVO PRINCIPAL ES AYUDAR AL USUARIO A APRENDER Y PROCESAR INFORMACIÓN COMPLEJA PROVENIENTE DE SUS PREGUNTAS, DOCUMENTOS O IMÁGENES.

REGLAS ESTRICTAS:
1. IDIOMA DE SALIDA: Español nativo. Los documentos de entrada pueden estar en inglés u otros idiomas; compréndelos y da siempre tu respuesta en español.
2. NUNCA uses emojis ni negritas excesivas.
3. ESTILO: ${levelInstr}
4. TONO: ${toneInstr}
5. NUNCA hables en tercera persona (no digas "El usuario quiere..."). Respóndele directamente al usuario.

DEBES DIVIDIR TU RESPUESTA EN ESTAS 3 PARTES EXACTAS, USANDO MARKDOWN:

### SÍNTESIS
Realiza una síntesis muy clara y directa de tu respuesta al usuario (o del documento si lo hay).

### EXPLICACIÓN
Explica de manera sencilla y digerible la respuesta, usando un lenguaje amable que reduzca la carga cognitiva.

### TAREAS
Crea pasos accionables útiles. DEBES usar este esquema JSON exacto para devolver las tareas. 

\`\`\`json
{
  "type": "task-list",
  "steps": [
    { 
      "title": "Título descriptivo de la acción", 
      "bullets": ["Acción específica 1"], 
      "duration": "5 min" 
    }
  ]
}
\`\`\``;
}

function buildContextHistory(history: AgentMessage[]) {
  const lastImageIndex = history.findLastIndex((m) => m.image);

  return history.map((msg, idx) => {
      const truncatedDoc = msg.documentText
        ? msg.documentText.slice(0, 4000) + (msg.documentText.length > 4000 ? "..." : "")
        : "";

      let combinedContent = msg.content;
      if (msg.documentText) {
        combinedContent = `[DOCUMENTO ADJUNTO]:\n${truncatedDoc}\n\n[MENSAJE DEL USUARIO]:\n${msg.content}`;
      }

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
    }).slice(-3);
}

function extractJsonFromContent(content: string) {
  const mdMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
  if (mdMatch) {
    return { jsonPart: mdMatch[1].trim(), extractedContent: content.replace(mdMatch[0], "").trim() };
  }
  const regex = /###\s*TAREAS\s*([\s\S]*)/i;
  const match = content.match(regex);
  if (match) {
    let rawJson = match[1].trim();
    if (rawJson.startsWith('```json')) rawJson = rawJson.slice(7).trim();
    if (rawJson.startsWith('```')) rawJson = rawJson.slice(3).trim();
    if (rawJson.endsWith('```')) rawJson = rawJson.slice(0, -3).trim();
    return { jsonPart: rawJson, extractedContent: content.replace(match[0], "").trim() };
  }
  return { jsonPart: "", extractedContent: content };
}

function extractExplanation(content: string) {
  const regex = /###\s*EXPLICACI[OÓ]N\s*([\s\S]*?)(?:###|$)/i;
  const match = content.match(regex);
  if (match) {
    return { explanation: match[1].trim(), cleanedContent: content.replace(match[0], "").trim() };
  }
  return { explanation: "", cleanedContent: content };
}

function parseAgentResponse(rawContent: string) {
  log.info("AI RAW:", { snippet: rawContent.slice(0, 100) });
  const { jsonPart, extractedContent } = extractJsonFromContent(rawContent);
  const { explanation, cleanedContent } = extractExplanation(extractedContent);

  let type: "text" | "task-list" | "summary" = "text";
  let steps = [];

  if (jsonPart) {
    try {
      const parsed = JSON.parse(jsonPart);
      if (parsed.steps) {
        type = "task-list";
        steps = parsed.steps;
      }
    } catch {
      log.warn("JSON error");
    }
  }

  let finalContent = cleanedContent
    .replace(/###\s*(S[IÍ]NTESIS|EXPLICACI[OÓ]N|TAREAS)/gi, "")
    .replace(/```json[\s\S]*?```/gi, "")
    .trim();

  if (!finalContent && extractedContent.length > 5) {
    finalContent = extractedContent.replace(/```json[\s\S]*?```/gi, "").replace(/###\s*(S[IÍ]NTESIS|EXPLICACI[OÓ]N|TAREAS)/gi, "").trim();
  }

  return {
    role: "assistant" as const,
    content: finalContent || "He analizado tu solicitud:",
    type,
    steps: steps.length > 0 ? steps : undefined,
    explanation: explanation || undefined,
  };
}


async function callApi(url: string, agentKey: string, deploymentId: string, bodyJson: any) {
  log.warn(`[CogniCare] Llamando a endpoint: ${url.split('?')[0]}`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": agentKey },
    body: JSON.stringify(bodyJson),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error(`[CogniCare] Error de Azure (${response.status}):`, { detail: errorText.slice(0, 100) });
    throw new Error(`Err ${response.status}`);
  }

  return response;
}

function mask(str: string | undefined) {
  if (!str) return "N/D";
  if (str.length < 10) return "****";
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

export async function processWithAgent(
  history: AgentMessage[],
  readingLevel: string = "simple",
  tone: string = "motivador"
): Promise<AgentMessage> {
  const key = AZURE_AI_AGENT_KEY();
  const endpoint = AZURE_AI_AGENT_ENDPOINT();
  const deployment = AZURE_AI_DEPLOYMENT_NAME();
  const version = AZURE_AI_API_VERSION();
  const systemPrompt = buildSystemPrompt(readingLevel, tone);

  log.warn("--- [CogniCare] Configuración Activa ---");
  log.warn(`URL: ${endpoint.split('?')[0]}`);
  log.warn(`Modelo: ${deployment}`);
  log.warn(`API Key: ${mask(key)}`);
  log.warn("---------------------------------------");

  try {
    const messages = buildContextHistory(history) as any[];
    messages.unshift({ role: "system", content: systemPrompt });

    const body = {
      model: deployment,
      messages,
      temperature: 0.3, // Temperatura balanceada para seguir instrucciones sin delirar
      max_tokens: 2000
    };

    const res = await callApi(endpoint, key, deployment, body);
    const data = await res.json();
    return parseAgentResponse(data.choices?.[0]?.message?.content || "");
  } catch (error) {
    log.error("Final catch en processWithAgent:", { msg: (error as Error).message });
    return {
      role: "assistant",
      content: "Lo siento, tuve un problema al conectar con mi cerebro artificial. ¿Podrías intentar de nuevo?",
      type: "text",
    };
  }
}
