import "server-only";
import { serverEnv } from "@/server/env";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

/**
 * Kirim email transaksional via Resend REST API.
 * Tidak pernah melempar error: kegagalan email tidak boleh menggagalkan transaksi.
 * Tanpa RESEND_API_KEY, email dicetak ke log (mode pengembangan).
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const recipients = (Array.isArray(message.to) ? message.to : [message.to]).filter(Boolean);
  if (recipients.length === 0) return;

  if (!serverEnv.resendApiKey) {
    console.info(`[email:dev] → ${recipients.join(", ")} | ${message.subject}\n${message.text}\n`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: serverEnv.emailFrom,
        to: recipients,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      console.error(`[email] Resend ${res.status}: ${await res.text()}`);
    }
  } catch (error) {
    console.error("[email] Gagal mengirim email", error);
  }
}
