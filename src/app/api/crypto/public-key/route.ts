import { NextResponse } from "next/server";
import { getSeedPublicKeyPem } from "@/lib/seed-crypto";

export async function GET() {
  return NextResponse.json({
    algorithm: "RSA-OAEP-256",
    public_key_pem: getSeedPublicKeyPem(),
  });
}

