const MOJIBAKE_PATTERN =
  /[\u0080-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/;

const CP1252_BYTES = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const percentEncodeCp1252 = (value: string) => {
  let encoded = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    const byte = code <= 0xff ? code : CP1252_BYTES.get(code);
    if (byte == null) {
      return null;
    }
    encoded += `%${byte.toString(16).padStart(2, "0")}`;
  }
  return encoded;
};

export const normalizeArabicText = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!MOJIBAKE_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const encoded = percentEncodeCp1252(trimmed);
  if (!encoded) return trimmed;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return trimmed;
  }
};

export const decodeUnicodeEscapes = (value?: string | null) => {
  if (value == null) return "";
  const raw = String(value);

  const decoded = raw
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_m, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      if (!Number.isFinite(codePoint)) return _m;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return _m;
      }
    })
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_m, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\v/g, "\v")
    .replace(/\\\\/g, "\\");

  return normalizeArabicText(decoded);
};

const DEFAULT_BRAND_NAME = "CafeMS Demo";

export const normalizeBrandName = (
  value?: string | null,
  fallback: string = DEFAULT_BRAND_NAME
) => {
  const normalized = normalizeArabicText(value) || "";
  const cleaned = normalized
    .replace(/CafeMS Demo|CafeMS Demo|CafeMS Demo/gu, "CafeMS Demo")
    .replace(/CafeMS Demo|CafeMS Demo|CafeMS Demo/giu, "CafeMS Demo")
    .replace(/كافتيريا/gu, "كافيه");
  const safeFallback = normalizeArabicText(fallback) || DEFAULT_BRAND_NAME;
  const safe = cleaned.trim() || safeFallback;
  return safe;
};
