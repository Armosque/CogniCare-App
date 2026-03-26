import { z } from 'zod';

/**
 * Esquema para los pasos de una tarea (Equivalente a Pydantic en TS).
 */
export const StepSchema = z.object({
  title: z.string().describe("Título claro del paso"),
  bullets: z.array(z.string()).optional().describe("Detalles específicos del paso"),
  duration: z.string().optional().describe("Tiempo estimado (ej: 5 min)")
});

/**
 * Esquema completo de la lista de tareas.
 */
export const TaskListSchema = z.object({
  type: z.literal("task-list"),
  steps: z.array(StepSchema)
});

/**
 * Esquema completo de la respuesta de CogniCare.
 */
export const CogniCareResponseSchema = z.object({
  synthesis: z.string().describe("Resumen humano y empático del tema o documento"),
  explanation: z.string().describe("Justificación técnica/accesibilidad de la respuesta"),
  tasks: z.array(StepSchema).optional().describe("Lista de pasos a seguir si aplica")
});

export type CogniCareResponse = z.infer<typeof CogniCareResponseSchema>;
export type TaskList = z.infer<typeof TaskListSchema>;
export type StepItem = z.infer<typeof StepSchema>;
