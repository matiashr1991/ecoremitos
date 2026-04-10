import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { toCsvValue } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const months = Number(request.nextUrl.searchParams.get("months") || "12");
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  try {
    const oldLogs = await prisma.auditLog.findMany({
      where: { createdAt: { lt: cutoff } },
      orderBy: { createdAt: "asc" },
      take: 100000,
    });

    if (oldLogs.length === 0) {
      return NextResponse.json({ success: true, archived: 0, deleted: 0, cutoff });
    }

    const dir = path.join(process.cwd(), "audit-archive");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filePath = path.join(dir, `audit-archive-${stamp}.csv`);

    const header = [
      "id",
      "createdAt",
      "userEmail",
      "action",
      "entityType",
      "entityId",
      "ipAddress",
      "userAgent",
      "oldValues",
      "newValues",
    ];

    const lines = oldLogs.map((log) => [
      toCsvValue(Number(log.id)),
      toCsvValue(log.createdAt.toISOString()),
      toCsvValue(log.userEmail),
      toCsvValue(log.action),
      toCsvValue(log.entityType),
      toCsvValue(log.entityId),
      toCsvValue(log.ipAddress),
      toCsvValue(log.userAgent),
      toCsvValue(log.oldValues),
      toCsvValue(log.newValues),
    ].join(","));

    await writeFile(filePath, [header.join(","), ...lines].join("\n"), "utf8");

    const deleted = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    await prisma.auditLog.create({
      data: {
        action: "AUDIT_RETENTION_PURGE",
        entityType: "System",
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null,
        userAgent: request.headers.get("user-agent"),
        newValues: {
          cutoff,
          archived: oldLogs.length,
          deleted: deleted.count,
          archiveFile: filePath,
        },
      },
    });

    return NextResponse.json({
      success: true,
      cutoff,
      archived: oldLogs.length,
      deleted: deleted.count,
      archiveFile: filePath,
    });
  } catch (error) {
    console.error("Audit retention error:", error);
    return NextResponse.json({ success: false, error: "Error en retención de auditoría" }, { status: 500 });
  }
}
