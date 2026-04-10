import { NextResponse } from "next/server";
import { verificarVencimientos } from "@/actions/guias.actions";

/**
 * Endpoint para ser llamado por un servicio de CRON externo (e.g. Vercel Cron, GitHub Actions, etc.)
 * Se recomienda proteger este endpoint con un token en producción.
 */
export async function GET(request: Request) {
  // Opcional: Validar CRON_SECRET para seguridad
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await verificarVencimientos();
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
