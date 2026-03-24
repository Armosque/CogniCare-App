"use server"

export interface AgentMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string; // Base64 string for multimodal support
  documentText?: string; // Hidden text extracted from docs for AI context
  type?: 'text' | 'task-list' | 'summary';
  steps?: { title: string; duration?: string; bullets?: string[] }[];
  explanation?: string;
}

export async function processWithAgent(history: AgentMessage[], readingLevel: string = 'simple', tone: string = 'motivador'): Promise<AgentMessage> {
  const agentKey = process.env.AZURE_AI_AGENT_KEY;
  const endpoint = process.env.AZURE_AI_AGENT_ENDPOINT;
  const deploymentId = process.env.AZURE_AI_DEPLOYMENT_NAME || "Phi-4"; 
  const apiVersion = "2024-02-15-preview";

  let readingLevelInstructions = "";
  if (readingLevel === 'simple') {
    readingLevelInstructions = "Usa palabras muy básicas, frases cortas de máximo 10 o 15 palabras. Evita totalmente tecnicismos, modismos complejos o metáforas.";
  } else if (readingLevel === 'intermedio') {
    readingLevelInstructions = "Usa un lenguaje claro y directo, para uso general, sin jerga excesiva.";
  } else {
    readingLevelInstructions = "Usa lenguaje estándar, fluido y detallado, incorporando términos técnicos si es apropiado.";
  }

  let toneInstructions = "";
  if (tone === 'motivador') {
    toneInstructions = "Sé extremadamente entusiasta y elogia el esfuerzo del usuario con palabras de apoyo.";
  } else if (tone === 'directo') {
    toneInstructions = "Sé muy conciso, lógico, y al grano. Evita adornos innecesarios. No uses emojis emocionales y enfócate únicamente en resolver la solicitud.";
  } else if (tone === 'empatico') {
    toneInstructions = "Sé muy empático, tranquilo, paciente, comprensivo y utiliza un tono relajante, validando los sentimientos del usuario.";
  } else {
    toneInstructions = "Responde de forma cálida, paciente y estructurada.";
  }

  const systemPrompt = `
    You are CogniCare, an assistant strictly designed to reduce cognitive load for neurodiverse people (ADHD, Autism, Dyslexia).

    LANGUAGE RULE — CRITICAL:
    1. Detect the language of the user's message (e.g., Spanish, English, etc.).
    2. YOU MUST RESPOND ENTIRELY IN THAT SAME LANGUAGE.
    3. If the user writes in Spanish, EVERYTHING (including task steps and explanations) must be in Spanish.
    4. DO NOT use English unless the user's query is in English.

    READING LEVEL INSTRUCTIONS:
    > ${readingLevelInstructions}

    TONE INSTRUCTIONS:
    > ${toneInstructions}

    CRITICAL REGULATIONS:
    - DO NOT USE EMOJIS under any circumstances.
    - Do not use special characters or pictographic icons.

    RESPONSE TYPE — READ CAREFULLY:
    Before responding, classify the user's intent:

    TYPE A — PROCEDURE / LEARNING PLAN: The user wants to DO something, organize a plan, or learn a topic.
    - If a document is provided, FIRST provide a simple explanation/summary of its content in the text response.
    - THEN, use the JSON format below to suggest 2-3 interactive activities or steps to reinforce understanding.
    - DO NOT create steps like "Read the document" (the user already gave it to you). Create steps like "Practice with..." or "Draw a diagram of...".

    TYPE B — QUICK INFO: The user asks a short question or needs a very brief one-line answer.
    - Respond directly with structured text. Do NOT use the JSON step format.

    CRITICAL: ALWAYS provide the explanation in the main text before any JSON steps.
    CRITICAL: Provide the synthesis in the user's language. DO NOT repeat raw snippets.

    ONLY for TYPE A responses, include this block at the START of your response:
    [JSON_START]
    {
      "type": "task-list",
      "steps": [
        { "title": "Step 1", "bullets": ["...", "..."], "duration": "5 min" }
      ]
    }
    [JSON_END]

    GENERAL FORMAT RULES:
    - Do NOT write long paragraphs.
    - ALWAYS use headings (### ) and bullet lists.
    - Leave spacing between major sections.

    INTERNAL EXPLANATION:
    - At the END of every response, include a MANDATORY brief section between [EXPLICACION_START] and [EXPLICACION_END].
    - Use THESE EXACT TAGS with underscores.
    - Inside these tags, briefly explain WHY you structured the response this way, based on the user's neurodiversity needs.
  `;

  // Convert history to multimodal format if needed
  const contextHistory = history.map(msg => {
    const combinedContent = msg.documentText 
      ? `[SOURCE DOCUMENT]:\n${msg.documentText}\n\n[USER QUERY]:\n${msg.content}`
      : msg.content;

    if (msg.image && msg.role === 'user') {
      return {
        role: 'user',
        content: [
          { type: 'text', text: combinedContent },
          { type: 'image_url', image_url: { url: msg.image } }
        ]
      };
    }
    return {
      role: msg.role,
      content: combinedContent
    };
  }).slice(-6);

  try {
    if (!agentKey || !endpoint) {
       throw new Error("Faltan llaves de Azure en el archivo .env.local");
    }

    let url = endpoint.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    // Check if it's already a complete chat completion URL (often from Foundry/MaaS)
    const isComplete = url.toLowerCase().includes("/chat/completions") || url.toLowerCase().includes("/v1/chat/completions");

    if (!isComplete) {
      // If it looks like a standard Azure OpenAI resource base URL, handle it
      if (url.includes("openai.azure.com")) {
        url = `${url.replace(/\/$/, '')}/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`;
      } else {
        // Fallback or Generic AI Foundry Project endpoint
        url = `${url.replace(/\/$/, '')}/v1/chat/completions`;
      }
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': agentKey
      },
      body: JSON.stringify({
        model: deploymentId,
        messages: [
          { role: 'system', content: systemPrompt },
          ...contextHistory
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
        let errDetails = "";
        try {
          const errData = await response.json();
          errDetails = JSON.stringify(errData);
        } catch (e) {
          errDetails = response.statusText;
        }
        console.error("Azure Response Error:", errDetails);
        throw new Error(`Azure API Error (${response.status}): ${errDetails}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Logic to parse JSON if exists - ROBUST VERSION
    let type: 'text' | 'task-list' | 'summary' = 'text';
    interface StepItem { title: string; duration?: string; bullets?: string[] }
    let steps: StepItem[] = [];
    let cleanContent = content;

    // More robust JSON extraction
    let jsonPart = "";
    let extractedContent = content;

    const explicitRegex = /\[JSON_START\]\s*(?:```json)?([\s\S]*?)(?:```)?\s*\[JSON_END\]/i;
    const mdRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;

    const explicitMatch = content.match(explicitRegex);
    const mdMatch = content.match(mdRegex);

    if (explicitMatch) {
      jsonPart = explicitMatch[1].trim();
      extractedContent = content.replace(explicitRegex, '').trim();
    } else if (mdMatch) {
      jsonPart = mdMatch[1].trim();
      extractedContent = content.replace(mdRegex, '').trim();
    } else {
      // Fallback: look for the first { and last }
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start && content.includes('"steps"')) {
        jsonPart = content.substring(start, end + 1);
        extractedContent = content.replace(jsonPart, '').trim();
      }
    }

    // Extraction of explanation - More flexible regex to handle model variability
    let explanation = "";
    const explanationRegex = /\[EXPLICACI[ÓO]N[_\s]START\]\s*([\s\S]*?)\s*\[EXPLICACI[ÓO]N[_\s](?:END|ENLACE|FIN)\]/i;
    const explanationMatch = content.match(explanationRegex);
    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
      extractedContent = extractedContent.replace(explanationRegex, '').trim();
    }

    if (jsonPart) {
      try {
        const parsed = JSON.parse(jsonPart);
        if (parsed.steps && Array.isArray(parsed.steps)) {
          type = 'task-list';
          steps = parsed.steps;
          // Clean the content of JSON tags and also any leading/trailing markdown characters from the model
          cleanContent = extractedContent
            .replace(/\[JSON_START\]/ig, '')
            .replace(/\[JSON_END\]/ig, '')
            .replace(/```json/ig, '')
            .replace(/```/ig, '')
            .replace(explanationRegex, '') // Also remove explanation from extracted text
            .trim();
        }
      } catch (e) {
        console.error("JSON Parse Error within robust extractor");
      }
    }

    // Final cleanup for cleanContent to ensure no tags remain
    cleanContent = extractedContent
        .replace(explanationRegex, '')
        .replace(/\[JSON_START\]/ig, '')
        .replace(/\[JSON_END\]/ig, '')
        .trim();

    return {
      role: 'assistant',
      content: (cleanContent || "He aquí los pasos para tu tarea:").trim(),
      type,
      steps: steps.length > 0 ? steps : undefined,
      explanation: explanation || undefined
    };

  } catch (error: any) {
    console.warn("API Error:", error);
    return {
      role: 'assistant',
      content: `Lo siento, sigo teniendo problemas para hablar con mi "cerebro" en Azure.\n\nURL intentada: \`${endpoint}\`\nError: \`${error.message || 'Desconocido'}\`\n\n**Observación importante**: Veo que el servidor lleva varias horas encendido. Si recientemente modificaste tu archivo \`.env.local\`, **los cambios no se aplicarán hasta que reinicies el servidor**. Ve a la terminal, presiona \`Ctrl + C\` para detenerlo, y vuelve a correr \`npm run dev\`.`,
      type: 'text'
    };
  }
}
