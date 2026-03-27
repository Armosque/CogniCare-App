import { TaskListSchema, CogniCareResponseSchema, StepItem } from "./schemas";

export function buildReadingLevelInstructions(level: string): string {
  const map: Record<string, string> = {
    simple: "Usa palabras muy básicas, frases cortas de máximo 10 o 15 palabras. Evita tecnicismos.",
    intermedio: "Usa un lenguaje claro y directo, para uso general, sin jerga excesiva.",
    avanzado: "Usa lenguaje estándar, fluido y detallado, incorporando términos técnicos si es apropiado.",
  };
  return map[level] ?? map.simple;
}

export function buildToneInstructions(tone: string): string {
  const map: Record<string, string> = {
    motivador: "Sé entusiasta y elogia el esfuerzo del usuario con palabras de apoyo.",
    directo: "Sé conciso y al grano. Evita adornos innecesarios.",
    empatico: "Sé empático, tranquilo y comprensivo, validando los sentimientos del usuario.",
  };
  return map[tone] ?? map.motivador;
}

export function buildSystemPrompt(readingLevel: string, tone: string): string {
  const level = buildReadingLevelInstructions(readingLevel);
  const toneInstr = buildToneInstructions(tone);

  return `Eres CogniCare, un asistente IA para personas con neurodiversidad (TDAH, TEA, Dislexia).
Responde SIEMPRE en español. No uses emojis.
Nivel de lectura: ${level}
Tono: ${toneInstr}

INSTRUCCION IMPORTANTE: Si el usuario comparte un documento, debes:
1. Hacer una sintesis clara y empatica en 1-2 parrafos.
2. Explicar como organizaste la informacion entre [EXPLICACION_START] y [EXPLICACION_END].
3. Si hay pasos a seguir, agrega un JSON al final entre [JSON_START] y [JSON_END].

Formato del JSON:
[JSON_START]
{"type":"task-list","steps":[{"title":"Titulo del paso","bullets":["detalle 1","detalle 2"],"duration":"5 min"}]}
[JSON_END]

Si solo es una pregunta conversacional sin documento, responde directamente y no incluyas JSON.`;
}

export function extractJsonFromResilient(content: string): { jsonPart: string; cleaned: string } {
  // 1. Try explicit tags
  const explicitRegex = /\[JSON[_\s](?:START|INICIO)\]\s*([\s\S]*?)(?:\[JSON[_\s](?:END|FIN)\]|$)/i;
  const explicitMatch = content.match(explicitRegex);
  if (explicitMatch) {
    return { jsonPart: explicitMatch[1].trim(), cleaned: content.replace(explicitRegex, "").trim() };
  }

  // 2. Try markdown code blocks
  const mdRegex = /```(?:json)?\s*(\{[\s\S]*?"steps"[\s\S]*?\})\s*```/i;
  const mdMatch = content.match(mdRegex);
  if (mdMatch) {
    return { jsonPart: mdMatch[1].trim(), cleaned: content.replace(mdRegex, "").trim() };
  }

  // 3. Try raw object detection
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const potential = content.substring(firstBrace, lastBrace + 1);
    if (potential.includes('"steps"')) {
       return { jsonPart: potential, cleaned: (content.substring(0, firstBrace) + content.substring(lastBrace + 1)).trim() };
    }
  }

  return { jsonPart: "", cleaned: content };
}

export function extractExplanationResilient(content: string): { explanation: string; cleaned: string } {
  const exRegex = /\[EXPLICACI[ÓO]N[_\s](?:START|INICIO)\]\s*([\s\S]*?)(?:\[EXPLICACI[ÓO]N[_\s](?:END|FIN)\]|$)/i;
  const match = content.match(exRegex);
  if (match) {
    return { explanation: match[1].trim(), cleaned: content.replace(exRegex, "").trim() };
  }
  
  const lines = content.split('\n');
  const explIdx = lines.findIndex(l => l.toLowerCase().startsWith('explicación:') || l.toLowerCase().startsWith('porque:'));
  if (explIdx !== -1) {
    const explanation = lines.slice(explIdx).join('\n').replace(/^explicación:\s*/i, '').trim();
    const cleaned = lines.slice(0, explIdx).join('\n').trim();
    return { explanation, cleaned };
  }

  return { explanation: "", cleaned: content };
}

export function parseAgentResponse(rawContent: string) {
  // Try to parse the whole thing as JSON first
  try {
    const parsed = JSON.parse(rawContent);
    const valid = CogniCareResponseSchema.safeParse(parsed);
    if (valid.success) {
      return {
        role: "assistant" as const,
        content: valid.data.synthesis,
        explanation: valid.data.explanation,
        steps: valid.data.tasks,
        type: valid.data.tasks ? 'task-list' as const : 'text' as const
      };
    }
  } catch {}

  // Multi-step resilient extraction
  const { jsonPart: extractedJsonPart, cleaned } = extractJsonFromResilient(rawContent);
  let jsonPart = extractedJsonPart;
  const { explanation, cleaned: afterExpl } = extractExplanationResilient(cleaned);

  // Extract PASOS section and convert numbered steps to task cards
  let steps: StepItem[] = [];
  let type: "text" | "task-list" = "text";
  let finalContent = afterExpl;

  const pasosMatch = afterExpl.match(/(?:TAREAS|PASOS|STEPS)\s*:\s*([\s\S]+?)(?:\n\n|$)/i);
  if (pasosMatch) {
    const pasosText = pasosMatch[1];
    finalContent = afterExpl.replace(pasosMatch[0], '').trim();
    
    const numberedLines = pasosText.match(/^\s*\d+\.\s*(.+)$/gm);
    if (numberedLines && numberedLines.length > 0) {
      steps = numberedLines.map(line => ({
        title: line.replace(/^\s*\d+\.\s*/, '').trim(),
        bullets: [],
        duration: '5 min'
      }));
      type = 'task-list';
    }
  }

  // Fallback: try JSON-embedded task list
  if (steps.length === 0 && jsonPart) {
    try {
      if (jsonPart.endsWith(',')) jsonPart = jsonPart.slice(0, -1);
      if (!jsonPart.endsWith('}')) jsonPart += '}';
      const parsed = JSON.parse(jsonPart);
      const validation = TaskListSchema.safeParse(parsed);
      if (validation.success) {
        steps = validation.data.steps;
        type = "task-list";
      }
    } catch {}
  }

  // Clean SINTESIS label from content
  finalContent = finalContent
    .replace(/^SINTESIS\s*:\s*/i, "")
    .replace(/^\[?S[ÍI]NTESIS\]?\s*:\s*/i, "")
    .replace(/^resumen\s*:\s*/i, "")
    .trim();

  return {
    role: "assistant" as const,
    content: finalContent || "Aqui tienes la respuesta:",
    explanation: explanation || undefined,
    steps: steps.length > 0 ? steps : undefined,
    type
  };
}
