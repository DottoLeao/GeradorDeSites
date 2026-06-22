import { getPlatformHost } from "@/lib/utils";

export interface TenantInfo {
  type: "platform" | "site";
  slug?: string;
  customDomain?: string;
}

export function resolveTenantFromHost(host: string): TenantInfo {
  const platformHost = getPlatformHost();
  const normalizedHost = host.split(":")[0].toLowerCase();
  const normalizedPlatform = platformHost.split(":")[0].toLowerCase();

  if (
    normalizedHost === normalizedPlatform ||
    normalizedHost === `app.${normalizedPlatform}` ||
    normalizedHost === "localhost" ||
    normalizedHost.startsWith("app.")
  ) {
    return { type: "platform" };
  }

  const platformSuffix = `.${normalizedPlatform}`;
  if (normalizedHost.endsWith(platformSuffix)) {
    const slug = normalizedHost.slice(0, -platformSuffix.length);
    if (slug && slug !== "app" && !slug.includes(".")) {
      return { type: "site", slug };
    }
  }

  return { type: "site", customDomain: normalizedHost };
}

export function isPlatformHost(host: string): boolean {
  return resolveTenantFromHost(host).type === "platform";
}
