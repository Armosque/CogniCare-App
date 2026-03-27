export interface ParsedAgentStep {
  title: string;
  duration?: string;
  bullets?: string[];
}

export interface ParsedAgentResponse {
  role: "assistant";
  content: string;
  type: "text" | "task-list" | "summary";
  steps?: ParsedAgentStep[];
  explanation?: string;
  synthesis?: string;
}

interface ParseAgentOptions {
  requireStructuredSections?: boolean;
  requireTasks?: boolean;
}

interface DurationExtraction {
  title: string;
  duration?: string;
}

function repairMojibake(text: string): string {
  let result = text;

  for (let i = 0; i < 2; i++) {
    if (!/[ÃƒÃ‚Ã¢]/.test(result)) break;
    try {
      result = Buffer.from(result, "latin1").toString("utf8");
    } catch {
      break;
    }
  }

  return result;
}

function normalizeText(text: string): string {
  return repairMojibake(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractSection(content: string, names: string[]): string {
  const joined = names.join("|");
  const allSections = "S[IÍ]NTESIS|SINTESIS|EXPLICACI[OÓ]N|EXPLICACION|TAREAS";
  const pattern = new RegExp(
    `(?:###\\s*)?(?:${joined})\\s*:?\\s*([\\s\\S]*?)(?=(?:###\\s*)?(?:${allSections})\\s*:?|$)`,
    "i"
  );
  const match = content.match(pattern);
  return match?.[1]?.trim() ?? "";
}

function dedupeRepeatedPhrases(text: string): string {
  const words = text.split(/\s+/);
  const cleaned: string[] = [];

  for (const word of words) {
    const prev = cleaned[cleaned.length - 1];
    const prev2 = cleaned[cleaned.length - 2];
    if (word === prev && word === prev2) continue;
    cleaned.push(word);
  }

  return cleaned.join(" ").replace(/\s+([.,;:!?])/g, "$1").trim();
}

function splitInlineNumberedTasks(content: string): string {
  const normalized = normalizeText(content);
  const withLineBreaks = normalized
    .replace(/\s+(?=(?:\d+[.)]|paso\s*\d+[:.)-])\s*)/gi, "\n")
    .replace(/(?<!^)(?=(?:\d+[.)]|paso\s*\d+[:.)-])\s+)/gi, "\n");

  return withLineBreaks
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function extractDurationFromTitle(title: string): DurationExtraction {
  const match = title.match(/\((\d+)\s*(min|mins|minutos?)\)$/i);
  if (!match) return { title: title.trim() };

  return {
    title: title.replace(/\((\d+)\s*(min|mins|minutos?)\)$/i, "").trim(),
    duration: `${match[1]} min`,
  };
}

function estimateTaskDuration(title: string, bullets: string[] = []): string {
  const text = `${title} ${bullets.join(" ")}`.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  let minutes = 3;

  if (wordCount > 18) minutes += 2;
  if (wordCount > 35) minutes += 2;

  if (/(analiza|compar|relaciona|argumenta|justifica|evalua|interpreta)/i.test(text)) minutes += 4;
  if (/(explica|describe|desarrolla|responde|resume|redacta|escribe)/i.test(text)) minutes += 2;
  if (/(crea|disena|propone|planifica|elabora|construye|genera)/i.test(text)) minutes += 3;
  if (/(investiga|busca|lee|revisa|observa)/i.test(text)) minutes += 2;
  if (/(presenta|graba|expone|comparte|aplica)/i.test(text)) minutes += 2;

  if (bullets.length >= 2) minutes += 1;
  if (bullets.length >= 4) minutes += 2;

  if (minutes <= 4) return "3 min";
  if (minutes <= 6) return "5 min";
  if (minutes <= 8) return "7 min";
  if (minutes <= 11) return "10 min";
  if (minutes <= 14) return "12 min";
  return "15 min";
}

function finalizeSteps(steps: ParsedAgentStep[]): ParsedAgentStep[] {
  return steps.map((step) => {
    const extracted = extractDurationFromTitle(step.title);
    const bullets = (step.bullets || []).filter(Boolean);

    return {
      title: extracted.title,
      bullets,
      duration: extracted.duration || step.duration || estimateTaskDuration(extracted.title, bullets),
    };
  });
}

function parseTasksFromPlainText(content: string): ParsedAgentStep[] {
  const lines = splitInlineNumberedTasks(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const steps: ParsedAgentStep[] = [];
  let current: ParsedAgentStep | null = null;

  for (const line of lines) {
    const stepMatch = line.match(/^(?:[-*]\s*)?(?:\d+[.)]|paso\s*\d+[:.)-]?)\s*(.+)$/i);
    if (stepMatch) {
      if (current) steps.push(current);
      current = { title: stepMatch[1].trim(), bullets: [] };
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch && current) {
      current.bullets = [...(current.bullets || []), bulletMatch[1].trim()];
      continue;
    }

    if (current) current.bullets = [...(current.bullets || []), line];
  }

  if (current) steps.push(current);
  return finalizeSteps(steps.filter((step) => step.title));
}

function buildFallbackTasks(summary: string): ParsedAgentStep[] {
  const topic = summary || "el material compartido";
  return finalizeSteps([
    {
      title: "Repasa la idea principal",
      bullets: [
        `Vuelve a leer la sintesis sobre ${topic}.`,
        "Anota la idea mas importante en una sola frase.",
      ],
    },
    {
      title: "Explicalo con tus palabras",
      bullets: [
        "Cuenta el contenido como si se lo explicaras a otra persona.",
        "Si algo no queda claro, vuelve a la explicacion sencilla y comparala con tu version.",
      ],
    },
    {
      title: "Comprueba que lo dominaste",
      bullets: [
        "Escribe dos preguntas clave sobre el tema y respondelas sin mirar el texto.",
        "Piensa en un ejemplo practico o en una situacion real donde aplicarias esta idea.",
      ],
    },
  ]);
}

function buildStructuredContent(synthesis: string, explanation: string): string {
  let content = "";
  if (synthesis) content += `### SINTESIS\n${synthesis}\n\n`;
  if (explanation) content += `### EXPLICACION\n${explanation}\n\n`;
  return content.trim();
}

export function parseAgentResponse(rawContent: string, options: ParseAgentOptions = {}): ParsedAgentResponse {
  const normalized = dedupeRepeatedPhrases(normalizeText(rawContent));

  const synthesis = extractSection(normalized, ["SINTESIS", "SÍNTESIS"]);
  const explanation = extractSection(normalized, ["EXPLICACION", "EXPLICACIÓN"]);
  const tasksSection = extractSection(normalized, ["TAREAS"]);

  let steps = tasksSection ? parseTasksFromPlainText(tasksSection) : [];

  const fallbackBody = normalized
    .replace(/(?:###\s*)?(S[IÍ]NTESIS|SINTESIS|EXPLICACI[OÓ]N|EXPLICACION|TAREAS)\s*:?/gi, "")
    .trim();

  const finalSynthesis = synthesis || fallbackBody.split("\n").find(Boolean) || "He analizado el material compartido.";
  const finalExplanation =
    explanation || fallbackBody || "Aqui tienes una explicacion sencilla basada en el contenido recibido.";

  if (options.requireTasks && steps.length === 0) {
    steps = buildFallbackTasks(finalSynthesis);
  }

  steps = finalizeSteps(steps);

  return {
    role: "assistant",
    content: buildStructuredContent(finalSynthesis, finalExplanation),
    type: steps.length > 0 ? "task-list" : "text",
    steps: steps.length > 0 ? steps : undefined,
    explanation: finalExplanation,
    synthesis: finalSynthesis,
  };
}
