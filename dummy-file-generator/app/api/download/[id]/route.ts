import { NextRequest, NextResponse } from "next/server";

import { getJob } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = getJob(id);

  if (!item) {
    return NextResponse.json({ error: "파일이 없거나 만료되었습니다." }, { status: 404 });
  }

  return new NextResponse(item.buffer, {
    status: 200,
    headers: {
      "content-type": item.mimeType,
      "content-length": String(item.buffer.length),
      "content-disposition": `attachment; filename="${item.fileName}"`
    }
  });
}
