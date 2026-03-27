import fs from "node:fs";
import path from "node:path";
import { diagnoseAgentPipeline, type AgentMessage } from "../src/lib/ai-agent";

interface CliOptions {
  text?: string;
  file?: string;
  prompt: string;
  readingLevel: string;
  tone: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    prompt: "Analiza este documento y dame sintesis, explicacion y tareas.",
    readingLevel: "simple",
    tone: "motivador",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--text" && next) {
      options.text = next;
      i++;
      continue;
    }

    if (arg === "--file" && next) {
      options.file = next;
      i++;
      continue;
    }

    if (arg === "--prompt" && next) {
      options.prompt = next;
      i++;
      continue;
    }

    if (arg === "--reading-level" && next) {
      options.readingLevel = next;
      i++;
      continue;
    }

    if (arg === "--tone" && next) {
      options.tone = next;
      i++;
    }
  }

  return options;
}

function loadDocumentText(options: CliOptions): string {
  if (options.text) return options.text;
  if (options.file) {
    const absolutePath = path.resolve(process.cwd(), options.file);
    return fs.readFileSync(absolutePath, "utf8");
  }

  throw new Error("Debes indicar --text o --file para ejecutar el diagnostico.");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const documentText = loadDocumentText(options);

  const history: AgentMessage[] = [
    {
      role: "user",
      content: options.prompt,
      documentText,
    },
  ];

  const diagnostics = await diagnoseAgentPipeline(history, options.readingLevel, options.tone);
  process.stdout.write(`${JSON.stringify(diagnostics, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exit(1);
});
