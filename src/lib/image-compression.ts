import imageCompression from "browser-image-compression";

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
}

export interface CompressionError {
  code: "INVALID_TYPE" | "TOO_LARGE" | "COMPRESSION_FAILED";
  message: string;
}

export async function compressImage(
  file: File
): Promise<CompressionResult | CompressionError> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      code: "INVALID_TYPE",
      message: "Formato inválido. Use JPG, PNG, WebP ou GIF.",
    };
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return {
      code: "TOO_LARGE",
      message: `Imagem muito grande. Máximo permitido: ${MAX_SIZE_MB}MB antes da compressão.`,
    };
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/webp",
    });

    const resultFile = new File(
      [compressed],
      file.name.replace(/\.[^.]+$/, ".webp"),
      { type: "image/webp" }
    );

    return {
      file: resultFile,
      originalSize: file.size,
      compressedSize: resultFile.size,
    };
  } catch {
    return {
      code: "COMPRESSION_FAILED",
      message: "Falha ao comprimir a imagem. Tente outro arquivo.",
    };
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
