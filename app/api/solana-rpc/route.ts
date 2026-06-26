import { NextRequest, NextResponse } from "next/server";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://solana-rpc.publicnode.com";

export async function POST(request: NextRequest) {
  const body = await request.text();

  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body,
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

