import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/db-config";

export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const requestToken = request.headers.get("x-admin-token");

  if (!adminToken || requestToken !== adminToken) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Database not configured. Set DATABASE_URL (or AIVEN_DATABASE_URL / POSTGRES_URL / POSTGRES_PRISMA_URL).",
      },
      { status: 500 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database check failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

