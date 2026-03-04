export function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function parseAllowedOriginsInput(value: unknown): {
  origins: string[];
  error?: string;
} {
  if (value == null) return { origins: [] };
  if (!Array.isArray(value)) {
    return { origins: [], error: "allowedOrigins must be an array" };
  }

  const normalized: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      return { origins: [], error: "allowedOrigins entries must be strings" };
    }
    const origin = normalizeOrigin(entry.trim());
    if (!origin) {
      return {
        origins: [],
        error: `Invalid origin: ${entry}. Use full origins like https://app.example.com`,
      };
    }
    normalized.push(origin);
  }

  return { origins: Array.from(new Set(normalized)) };
}
