"use server";

import { headers } from "next/headers";

export type AuditRequestMeta = {
  ipAddress: string | null;
  userAgent: string | null;
};

function normalizeIp(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

export async function getAuditRequestMeta(): Promise<AuditRequestMeta> {
  const h = await headers();
  const ip =
    normalizeIp(h.get("x-forwarded-for")) ||
    normalizeIp(h.get("x-real-ip")) ||
    normalizeIp(h.get("cf-connecting-ip"));

  return {
    ipAddress: ip,
    userAgent: h.get("user-agent"),
  };
}
