export const TOLA_GRAMS = 11.6638;

export function formatNPR(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return "Rs " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatGram(g: number | string | null | undefined, digits = 3): string {
  return Number(g ?? 0).toFixed(digits) + " g";
}

export function gramsToTola(g: number): number {
  return g / TOLA_GRAMS;
}

export function tolaToGrams(t: number): number {
  return t * TOLA_GRAMS;
}

export function formatTola(g: number | string | null | undefined): string {
  return gramsToTola(Number(g ?? 0)).toFixed(4) + " tola";
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
