export const FILE_TYPES = ["pdf", "docx", "xlsx", "zip", "txt", "csv", "json", "bin"] as const;
export type FileType = (typeof FILE_TYPES)[number];

export const SIZE_UNITS = ["MiB", "MB"] as const;
export type SizeUnit = (typeof SIZE_UNITS)[number];

export const MODES = ["exact", "at_least"] as const;
export type GenerateMode = (typeof MODES)[number];

export const ZIP_STRUCTURES = ["flat", "hierarchy"] as const;
export type ZipStructure = (typeof ZIP_STRUCTURES)[number];

export const ZIP_EXTENSION_PROFILES = ["mixed", "text", "binary"] as const;
export type ZipExtensionProfile = (typeof ZIP_EXTENSION_PROFILES)[number];

export type GenerateInput = {
  type: FileType;
  targetSize: number;
  sizeUnit: SizeUnit;
  mode: GenerateMode;
  seed?: string;
  zipStructure?: ZipStructure;
  zipExtensionProfile?: ZipExtensionProfile;
};

export type GenerateOutput = {
  id: string;
  fileName: string;
  downloadUrl: string;
  targetBytes: number;
  actualBytes: number;
  checksumSha256: string;
  modeRequested: GenerateMode;
  modeApplied: GenerateMode;
  fallbackReason?: string;
  policy?: {
    maxTargetBytes: number;
    blobRecommendThresholdBytes: number;
  };
  delivery?: {
    strategy: "direct" | "blob";
    blobRecommended: boolean;
  };
};

export type GeneratedFile = {
  id: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  createdAt: number;
};
