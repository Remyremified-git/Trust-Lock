import { headers } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { getCurrentSessionUser } from "@/lib/auth";

export async function assertAdminToken(): Promise<void> {
  const sessionUser = await getCurrentSessionUser();
  if (sessionUser?.role === "ADMIN") {
    return;
  }

  const headerStore = await headers();
  const token = headerStore.get("x-admin-token");
  const { ADMIN_API_TOKEN } = getServerEnv();
  if (!token || token !== ADMIN_API_TOKEN) {
    throw new Error("Unauthorized admin request");
  }
}
