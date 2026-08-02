import { NextRequest, NextResponse } from "next/server";
import { sendVevntasEmail } from "@/lib/email";
import { requireUserAndProfile } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireUserAndProfile(request);
    if (profile.role !== "admin") return NextResponse.json({ error: "Solo el administrador puede probar el correo." }, { status: 403 });
    if (!user.email) return NextResponse.json({ error: "El usuario no tiene correo asociado." }, { status: 400 });
    const data = await sendVevntasEmail({
      to: user.email,
      subject: "Vevntas · correo configurado",
      title: "La integración de correo está funcionando",
      message: "Este es un mensaje de prueba enviado desde Vevntas mediante Resend y Vercel.",
    });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
