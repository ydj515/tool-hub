/**
 * 메모리에 저장된 생성 결과를 다운로드 응답으로 반환하는 API 라우트다.
 */
import { NextRequest, NextResponse } from "next/server";

import { getJob } from "@/lib/store";

export const runtime = "nodejs";

/**
 * 생성된 파일 ID로 다운로드 응답을 반환한다.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = getJob(id);

  if (!item) {
    return NextResponse.json({ error: "파일이 없거나 만료되었습니다." }, { status: 404 });
  }

  const body = new Uint8Array(item.buffer);

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": item.mimeType,
      "content-length": String(item.buffer.length),
      "content-disposition": `attachment; filename="${item.fileName}"`
    }
  });
}
