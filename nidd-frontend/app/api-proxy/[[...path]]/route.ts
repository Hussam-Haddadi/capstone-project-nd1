import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function apiOrigin(): string {
  return (process.env.NIDD_API_ORIGIN ?? "http://127.0.0.1:8000").replace(/\/$/, "");
}

async function proxy(request: NextRequest, pathSegments: string[] | undefined) {
  const parts = pathSegments ?? [];
  const suffix = parts.length ? parts.join("/") : "";
  const target = `${apiOrigin()}/api/${suffix}${request.nextUrl.search}`;

  const headers = new Headers();
  const accept = request.headers.get("Accept");
  if (accept) headers.set("Accept", accept);
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(target, init);
  const body = await res.arrayBuffer();
  const out = new NextResponse(body, { status: res.status });
  const ct = res.headers.get("Content-Type");
  if (ct) out.headers.set("Content-Type", ct);
  return out;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}
