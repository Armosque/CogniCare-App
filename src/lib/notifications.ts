"use server"
import { EmailClient } from "@azure/communication-email";
import { AZURE_COMM_CONN_STRING, AZURE_COMM_SENDER, isEmailConfigured } from "./env";
import { log } from "./log";

export async function sendTaskReminder(
  recipientEmail: string,
  taskTitle: string,
  stepTitle: string,
  stepDescription: string = ""
) {
  if (!isEmailConfigured()) {
    log.warn("Azure Communication Services no configurado — email no enviado");
    return { success: false, error: "Servicio de notificaciones no configurado" };
  }

  const connectionString = AZURE_COMM_CONN_STRING()!;
  const senderAddress = AZURE_COMM_SENDER()!;

  try {
    const client = new EmailClient(connectionString);
    const message = {
      senderAddress,
      content: {
        subject: `Recordatorio de CogniCare: ${taskTitle}`,
        plainText: `Hola, tienes pendiente este paso: "${stepTitle}".\nActividad: ${stepDescription}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h1 style="color: #3b82f6;">Recordatorio de CogniCare</h1>
            <p>Este es un recordatorio para tu tarea:</p>
            <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <p style="margin: 0; font-size: 1.1em;"><b>Paso pendiente:</b> ${stepTitle}</p>
              ${stepDescription ? `<p style="margin: 10px 0 0 0; color: #475569;">${stepDescription}</p>` : ""}
            </div>
            <p>Recuerda: No hay prisa. Cada pequeño paso es un gran logro.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 0.8em; color: #64748b;">Enviado automáticamente por CogniCare AI.</p>
          </div>
        `,
      },
      recipients: {
        to: [{ address: recipientEmail }],
      },
    };

    const poller = await client.beginSend(message);
    const result = await poller.pollUntilDone();

    log.info("Email enviado", { recipientEmail, stepTitle, messageId: result.id });
    return { success: true, id: result.id };
  } catch (error) {
    log.error("Error enviando email", { error: (error as Error).message, recipientEmail });
    return { success: false, error: (error as Error).message };
  }
}
