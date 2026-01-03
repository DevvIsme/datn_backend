import diacritics from "diacritics";

export function convertString(input: string) {
  return diacritics
    .remove(input)
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}
