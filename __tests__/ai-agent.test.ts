import { parseAgentResponse } from '@/lib/agent-response';

describe('ai-agent', () => {
  it('recupera tareas en texto plano cuando el modelo no devuelve JSON valido', () => {
    const raw = `### SINTESIS
La fotosintesis transforma luz en energia.

### EXPLICACION
Las plantas usan la luz solar para producir glucosa y oxigeno.

### TAREAS
1. Resume la idea principal
- Escribe una frase con la funcion de la fotosintesis
2. Explicalo con tus palabras
- Cuenta el proceso en voz alta
`;

    const result = parseAgentResponse(raw, {
      requireStructuredSections: true,
      requireTasks: true,
    });

    expect(result.type).toBe('task-list');
    expect(result.content).toContain('###');
    expect(result.content).not.toContain('TAREAS');
    expect(result.steps).toBeDefined();
    expect(result.steps!.length).toBeGreaterThanOrEqual(1);
    expect(result.steps?.[0].title).toContain('Resume la idea principal');
    expect(result.steps?.[0].duration).toBeTruthy();
    expect(result.explanation).toContain('plantas');
  });

  it('genera tareas de respaldo cuando llega un documento sin tareas estructuradas', () => {
    const raw = `### SINTESIS
El documento explica como organizar un presupuesto mensual.

### EXPLICACION
Primero se identifican ingresos y gastos. Luego se separan gastos fijos y variables para decidir ajustes realistas.`;

    const result = parseAgentResponse(raw, {
      requireStructuredSections: true,
      requireTasks: true,
    });

    expect(result.type).toBe('task-list');
    expect(result.steps).toBeDefined();
    expect(result.steps?.length).toBeGreaterThanOrEqual(3);
    expect(result.content).toContain('SINTESIS');
    expect(result.content).toContain('EXPLICACION');
    expect(result.content).not.toContain('TAREAS');
  });

  it('separa tareas numeradas en una sola linea en pasos independientes', () => {
    const raw = `### SINTESIS
El texto presenta herramientas de trabajo.

### EXPLICACION
Se describen varias formas practicas de usar una aplicacion.

### TAREAS
1. Describe como usarias la aplicacion en tu trabajo. 2. Piensa en un proyecto de marketing y explica como usarias el generador de materiales. 3. Explica como usarias el panel interactivo para visualizar datos.`;

    const result = parseAgentResponse(raw, {
      requireStructuredSections: true,
      requireTasks: true,
    });

    expect(result.type).toBe('task-list');
    expect(result.steps).toBeDefined();
    expect(result.steps).toHaveLength(3);
    expect(result.steps?.[0].title).toContain('Describe como usarias la aplicacion en tu trabajo');
    expect(result.steps?.[1].title).toContain('Piensa en un proyecto de marketing');
    expect(result.steps?.[2].title).toContain('Explica como usarias el panel interactivo');
    expect(result.content).not.toContain('TAREAS');
    expect(result.steps?.every((step) => Boolean(step.duration))).toBe(true);
  });

  it('deriva una sintesis minima cuando solo llega texto corrido', () => {
    const raw = 'El sistema nervioso coordina las funciones del cuerpo. Recibe informacion, la procesa y genera respuestas.';

    const result = parseAgentResponse(raw, {
      requireStructuredSections: true,
      requireTasks: true,
    });

    expect(result.content).toContain('SINTESIS');
    expect(result.content).toContain('EXPLICACION');
    expect(result.steps?.length).toBeGreaterThan(0);
  });

  it('respeta o estima duraciones por tarea', () => {
    const raw = `### SINTESIS
El material propone actividades practicas.

### EXPLICACION
Cada actividad tiene una complejidad distinta.

### TAREAS
1. Resume la idea central (4 min)
2. Analiza y compara dos ventajas del enfoque con ejemplos concretos
3. Crea una propuesta de aplicacion en tu trabajo con tres acciones y una justificacion`;

    const result = parseAgentResponse(raw, {
      requireStructuredSections: true,
      requireTasks: true,
    });

    expect(result.steps).toHaveLength(3);
    expect(result.steps?.[0].duration).toBe('4 min');
    expect(result.steps?.[1].duration).toBeTruthy();
    expect(result.steps?.[2].duration).toBeTruthy();
    expect(result.steps?.[1].title).not.toContain('(4 min)');
  });
});
