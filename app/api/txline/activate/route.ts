import { NextRequest, NextResponse } from "next/server";

const TXLINE_BASE_URL = process.env.TXLINE_BASE_URL || "https://txline.txodds.com";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("Authorization");
  const body = await request.text();

  const response = await fetch(`${TXLINE_BASE_URL}/api/token/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {})
    },
    body,
    cache: "no-store"
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "text/plain"
    }
  });
}
