import { Resend } from "resend";

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function client(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY no está configurada en Vercel.");
  return new Resend(key);
}

export async function sendVevntasEmail(input: {
  to: string;
  subject: string;
  title: string;
  message: string;
}) {
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Vevntas <onboarding@resend.dev>";
  const { data, error } = await client().emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#182033"><div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #dce2ec;border-radius:18px;padding:32px"><div style="font-weight:900;font-size:24px;color:#1d54bd">Vevntas</div><h1 style="font-size:24px;margin:28px 0 12px">${escapeHtml(input.title)}</h1><p style="line-height:1.6;color:#5d6675">${escapeHtml(input.message)}</p><a href="https://vevntas.vercel.app" style="display:inline-block;margin-top:18px;padding:12px 18px;background:#1d54bd;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Abrir Vevntas</a></div></body></html>`,
  });
  if (error) throw new Error(error.message);
  return data;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}
