const splitWords = (value: string) => {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createIconSignature = (nodeType: string) => {
  const words = splitWords(nodeType);
  const first = words[0] ?? "node";
  const second = words[1] ?? "";
  const baseChars = `${first[0] ?? "N"}${second[0] ?? first[1] ?? "D"}`.toUpperCase();
  const hash = hashString(nodeType).toString(36).toUpperCase().padStart(2, "0");
  const suffix = hash.slice(-2);
  return `${baseChars}${suffix}`;
};
