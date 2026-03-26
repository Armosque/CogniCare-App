import { 
  buildReadingLevelInstructions,
  parseAgentResponse
} from '@/lib/agent-utils';

describe('agent-utils', () => {
  it('buildReadingLevelInstructions should return mapped strings', () => {
    expect(buildReadingLevelInstructions('simple')).toContain('palabras muy básicas');
    expect(buildReadingLevelInstructions('avanzado')).toContain('lenguaje estándar');
    // Fallback
    expect(buildReadingLevelInstructions('unknown_level')).toContain('palabras muy básicas');
  });

  describe('parseAgentResponse', () => {
    it('should parse raw text output into simple text response without steps', () => {
      const raw = "¡Hola! Estoy listo para ayudarte.";
      const res = parseAgentResponse(raw);
      expect(res.role).toBe('assistant');
      expect(res.content).toBe(raw);
      expect(res.type).toBe('text');
      expect(res.steps).toBeUndefined();
    });

    it('should extract correct JSON steps when [JSON_START] is used', () => {
      const raw = `Aquí tienes las instrucciones:
[JSON_START]
{
  "type": "task-list",
  "steps": [
    { "title": "Primer paso", "duration": "5m" }
  ]
}
[JSON_END]
`;
      const res = parseAgentResponse(raw);
      expect(res.type).toBe('task-list');
      expect(res.steps).toHaveLength(1);
      expect(res.steps![0].title).toBe('Primer paso');
      expect(res.content).toBe('Aquí tienes las instrucciones:');
    });

    it('should extract hidden explanation if provided', () => {
      const raw = `Respuesta fácil para el usuario.
[EXPLICACION_START]
Elegí esta forma por el nivel de lectura.
[EXPLICACION_END]
`;
      const res = parseAgentResponse(raw);
      expect(res.content).toBe('Respuesta fácil para el usuario.');
      expect(res.explanation).toBe('Elegí esta forma por el nivel de lectura.');
    });
  });
});
