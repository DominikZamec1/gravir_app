// Mapa emoji placeholderů z instrukcí ({rocket}, {heart}, ...) na emoji,
// ať operátor vidí přesně to, co má být na lahvi.
const EMOJI: Record<string, string> = {
  heart: "❤️", sparkles: "✨", rocket: "🚀", smile: "🙂", flower: "🌸",
  unicorn: "🦄", paw: "🐾", butterfly: "🦋", star: "⭐", sun: "☀️",
  moon: "🌙", crown: "👑", fire: "🔥", gift: "🎁", music: "🎵",
};

/** Nahradí {placeholder} skutečným emoji (nebo nechá tak, když ho neznáme). */
export function renderEmoji(text: string | null): string {
  if (!text) return "";
  return text.replace(/\{([^}]+)\}/g, (_m, name: string) => EMOJI[name.trim().toLowerCase()] ?? `{${name}}`);
}

/** Veřejná URL DXF souboru v Supabase Storage (bucket dxf je public). */
export function dxfUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  const base = process.env.SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/dxf/${storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

const STATUS_CS: Record<string, string> = {
  label_printed: "Štítek vytištěn",
};

export function statusLabel(status: string | null): string {
  if (!status) return "—";
  return STATUS_CS[status] ?? status;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague",
  }).format(d);
}
