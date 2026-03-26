import { processWithAgent } from '@/lib/ai-agent';

export async function POST(req: Request) {
  try {
    const { messages, readingLevel, tone } = await req.json();

    // RESTAURACIÓN CALIDAD MODULAR:
    // Delegamos en processWithAgent que ya tiene el manejo de historial,
    // extracción de texto OCR/Vision y el prompt de neurodiversidad.
    const result = await processWithAgent(
      messages, 
      readingLevel || 'simple', 
      tone || 'motivador'
    );

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("[API/CHAT] Error fatal:", error);
    return new Response(JSON.stringify({ 
      role: 'assistant',
      content: 'Lo siento, tuve un problema al procesar tu solicitud. Intenta de nuevo.',
      type: 'text'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
