import { NextResponse } from "next/server";

const TXLINE_BASE_URL = process.env.TXLINE_BASE_URL || "https://txline.txodds.com";

export async function POST() {
  const response = await fetch(`${TXLINE_BASE_URL}/auth/guest/start`, {
    method: "POST",
    cache: "no-store"
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json"
    }
  });
}
