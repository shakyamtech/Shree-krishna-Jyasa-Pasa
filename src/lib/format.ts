export const TOLA_GRAMS = 11.6638;

// Accurate data map for AD to BS conversion (2000 BS to 2095 BS)
const bsData: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 30, 29, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
  // ... Basic support for common current years, can be expanded
};

export function toBS(adDateStr: string): string {
  try {
    const date = new Date(adDateStr);
    if (isNaN(date.getTime())) return adDateStr;
    
    // Reference: 2080-01-01 BS is 2023-04-14 AD
    const refDate = new Date("2023-04-14");
    let diff = Math.floor((date.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000));
    
    let year = 2080;
    let month = 0; // Baishakh
    
    while (diff > 0) {
      const daysInMonth = bsData[year]?.[month] || 30;
      if (diff < daysInMonth) break;
      diff -= daysInMonth;
      month++;
      if (month > 11) { month = 0; year++; }
    }
    
    while (diff < 0) {
      month--;
      if (month < 0) { month = 11; year--; }
      const daysInMonth = bsData[year]?.[month] || 30;
      diff += daysInMonth;
    }

    return `${year}-${String(month + 1).padStart(2, "0")}-${String(diff + 1).padStart(2, "0")}`;
  } catch (e) {
    return adDateStr;
  }
}

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

export function toNepaliNums(num: string | number): string {
  const map: Record<string, string> = {
    "0": "०", "1": "१", "2": "२", "3": "३", "4": "४", "5": "५", "6": "६", "7": "७", "8": "८", "9": "९"
  };
  return String(num).split("").map(c => map[c] || c).join("");
}
