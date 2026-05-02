import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { smtp_host, smtp_port, smtp_secure, usuario, password } = await request.json();
    if (!smtp_host || !usuario || !password) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    const transporter = nodemailer.createTransport({
      host: smtp_host, port: smtp_port || 465, secure: smtp_secure !== false,
      auth: { user: usuario, pass: password }, connectionTimeout: 10000, greetingTimeout: 10000,
    });
    await transporter.verify();
    return NextResponse.json({ success: true, message: "Conexión exitosa" });
  } catch (error: any) {
    const msg = error.message || "Error";
    let hint = msg;
    if (msg.includes("ECONNREFUSED")) hint = "Servidor no accesible. Verifica host y puerto.";
    else if (msg.includes("ENOTFOUND")) hint = "Host no encontrado.";
    else if (msg.includes("auth") || msg.includes("535")) hint = "Credenciales incorrectas.";
    else if (msg.includes("certificate")) hint = "Error SSL. Prueba cambiar el puerto.";
    return NextResponse.json({ success: false, error: hint }, { status: 400 });
  }
}
