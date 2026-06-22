"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button, Label } from "@/components/ui";
import { compressImage, formatFileSize } from "@/lib/image-compression";

interface ImageUploaderProps {
  siteId: string;
  label: string;
  currentUrl: string;
  onUpload: (url: string) => void;
}

export function ImageUploader({
  siteId,
  label,
  currentUrl,
  onUpload,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const result = await compressImage(file);

    if ("code" in result) {
      toast.error(result.message);
      setUploading(false);
      return;
    }

    toast.info(
      `Comprimido: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)}`
    );

    const formData = new FormData();
    formData.append("file", result.file);
    formData.append("siteId", siteId);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Erro no upload");
        return;
      }

      setPreview(data.url);
      onUpload(data.url);
      toast.success("Imagem enviada!");
    } catch {
      toast.error("Erro de conexão no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      {preview && (
        <div className="relative mt-2 aspect-video w-full max-w-xs overflow-hidden rounded-lg border">
          <Image
            src={preview}
            alt={label}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Enviando..." : preview ? "Trocar Imagem" : "Enviar Imagem"}
      </Button>
      <p className="mt-1 text-xs text-slate-500">
        JPG, PNG, WebP ou GIF. Máx. 5MB (comprimido automaticamente).
      </p>
    </div>
  );
}
