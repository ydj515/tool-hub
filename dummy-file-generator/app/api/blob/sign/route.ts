import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive()
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    if (!hasBlobToken) {
      return NextResponse.json(
        {
          error: "Blob 토큰이 설정되지 않았습니다.",
          hint: "Vercel 환경변수 BLOB_READ_WRITE_TOKEN 설정 후 실제 서명 로직을 연결하세요.",
          mock: {
            uploadId: randomUUID(),
            uploadUrl: null,
            requiredHeaders: {}
          }
        },
        { status: 501 }
      );
    }

    return NextResponse.json({
      uploadId: randomUUID(),
      uploadUrl: null,
      requiredHeaders: {
        "content-type": parsed.contentType,
        "x-file-name": parsed.fileName,
        "x-file-size": String(parsed.sizeBytes)
      },
      message: "실제 Blob 서명 로직 연결 전 임시 응답입니다. @vercel/blob put/client 토큰 발급 흐름을 연결하세요."
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력 검증 실패", detail: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Blob 서명 요청에 실패했습니다." }, { status: 500 });
  }
}
