export function parseTags(input: string) {
  return input
    .split(",")
    .map((tag) =>
      tag
        .trim()
        .toLowerCase()
        .replaceAll("ı", "i")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ş", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, "")
    )
    .filter(Boolean)
    .slice(0, 12);
}

export function tagsToInput(tags?: string[] | null) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}
