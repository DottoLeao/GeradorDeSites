import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function getPlatformHost(): string {
  return process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "localhost:3000";
}

export function getSiteUrl(slug: string): string {
  const host = getPlatformHost();
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${host.replace(/^app\./, "")}`;
}
