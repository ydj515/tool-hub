import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toBytes } from "@/lib/bytes";
import { generateByType } from "@/lib/generators";
import { MIME_BY_TYPE, timestampFileName } from "@/lib/generators/common";
import { sha256 } from "@/lib/hash";
import { BLOB_RECOMMEND_THRESHOLD_BYTES, MAX_TARGET_BYTES, MIN_TARGET_BYTES, recommendDeliveryStrategy } from "@/lib/policy";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveJob } from "@/lib/store";
import { FILE_TYPES, MODES, SIZE_UNITS, ZIP_EXTENSION_PROFILES, ZIP_STRUCTURES, type GenerateInput } from "@/lib/types";

const schema = z.object({
  type: z.enum(FILE_TYPES),
  targetSize: z.number().positive().max(1024),
  sizeUnit: z.enum(SIZE_UNITS).default("MiB"),
  mode: z.enum(MODES).default("exact"),
  seed: z.string().min(1).max(100).optional(),
  zipStructure: z.enum(ZIP_STRUCTURES).default("flat"),
  zipExtensionProfile: z.enum(ZIP_EXTENSION_PROFILES).default("mixed")
});

export const runtime = "nodejs";

function getClientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const rate = checkRateLimit(getClientKey(req));
    if (!rate.ok) {
      return NextResponse.json(
        {
          error: "요청 빈도 제한을 초과했습니다.",
          retryAfterMs: rate.retryAfterMs
        },
        {
          status: 429,
          headers: { "retry-after": String(Math.ceil(rate.retryAfterMs / 1000)) }
        }
      );
    }

    const body = (await req.json()) as GenerateInput;
    const parsed = schema.parse(body);

    const targetBytes = toBytes(parsed.targetSize, parsed.sizeUnit);
    if (targetBytes < MIN_TARGET_BYTES) {
      return NextResponse.json({ error: `targetBytes는 최소 ${MIN_TARGET_BYTES}B 이상이어야 합니다.` }, { status: 400 });
    }

    if (targetBytes > MAX_TARGET_BYTES) {
      return NextResponse.json(
        {
          error: `최대 크기 제한을 초과했습니다. 현재 정책: ${MAX_TARGET_BYTES} bytes`,
          maxTargetBytes: MAX_TARGET_BYTES
        },
        { status: 400 }
      );
    }

    const seed = parsed.seed ?? randomUUID();
    const generated = await generateByType(parsed.type, targetBytes, parsed.mode, seed, {
      zipStructure: parsed.zipStructure,
      zipExtensionProfile: parsed.zipExtensionProfile
    });
    const id = randomUUID();
    const fileName = timestampFileName(parsed.type, targetBytes);

    saveJob({
      id,
      fileName,
      mimeType: MIME_BY_TYPE[parsed.type],
      buffer: generated.buffer,
      createdAt: Date.now()
    });

    const deliveryStrategy = recommendDeliveryStrategy(targetBytes);

    return NextResponse.json({
      id,
      fileName,
      downloadUrl: `/api/download/${id}`,
      targetBytes,
      actualBytes: generated.buffer.length,
      checksumSha256: sha256(generated.buffer),
      modeRequested: parsed.mode,
      modeApplied: generated.modeApplied,
      fallbackReason: generated.fallbackReason,
      seed,
      policy: {
        maxTargetBytes: MAX_TARGET_BYTES,
        blobRecommendThresholdBytes: BLOB_RECOMMEND_THRESHOLD_BYTES
      },
      delivery: {
        strategy: deliveryStrategy,
        blobRecommended: deliveryStrategy === "blob"
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력 검증 실패", detail: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "파일 생성에 실패했습니다." }, { status: 500 });
  }
}
