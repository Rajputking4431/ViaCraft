export interface SizeOption {
  size: string;      // e.g. "8x8"
  inches: string;    // e.g. "8x8 inches"
  price: number;     // e.g. 1500 (price in INR)
}

export interface ParsedProduct {
  description: string;
  sizes: SizeOption[];
}

/**
 * Parses the product description to extract size chart options.
 * Size chart options are stored inside `[SIZE_CHART]...[/SIZE_CHART]` tags.
 */
export function parseProductDescription(desc: string | null): ParsedProduct {
  if (!desc) {
    return { description: "", sizes: [] };
  }

  // Regex to match [SIZE_CHART]JSON_STRING[/SIZE_CHART]
  const regex = /\[SIZE_CHART\]([\s\S]*?)\[\/SIZE_CHART\]/;
  const match = desc.match(regex);

  if (match) {
    try {
      const sizes = JSON.parse(match[1]) as SizeOption[];
      const cleanDescription = desc.replace(regex, "").trim();
      return { description: cleanDescription, sizes };
    } catch (e) {
      console.error("Failed to parse product size chart options:", e);
    }
  }

  return { description: desc, sizes: [] };
}

/**
 * Serializes the description text and size chart options into a single string.
 */
export function serializeProductDescription(desc: string, sizes: SizeOption[]): string {
  const cleanDesc = desc.replace(/\[SIZE_CHART\]([\s\S]*?)\[\/SIZE_CHART\]/g, "").trim();
  if (sizes.length === 0) {
    return cleanDesc;
  }
  return `${cleanDesc}\n\n[SIZE_CHART]${JSON.stringify(sizes)}[/SIZE_CHART]`;
}
