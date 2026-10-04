// Display formatting for dashboard numbers. Pure functions, so the same
// output is produced on the server render and in the browser.

const CURRENCY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface CurrencyParts {
  // Symbol, sign and whole units, e.g. "$12,480".
  whole: string;
  // Decimal separator and cents, e.g. ".00".
  fraction: string;
}

export function formatCurrency(value: number): string {
  return CURRENCY_FORMAT.format(value);
}

// Splits an amount so the cents can be set smaller than the whole units.
export function splitCurrency(value: number): CurrencyParts {
  let whole = "";
  let fraction = "";

  for (const part of CURRENCY_FORMAT.formatToParts(value)) {
    if (part.type === "decimal" || part.type === "fraction") {
      fraction += part.value;
    } else {
      whole += part.value;
    }
  }

  return { whole, fraction };
}

export function formatReplyTime(replyTimeMs: number | null): string {
  if (replyTimeMs === null) return "N/A";

  const totalSeconds = Math.round(replyTimeMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }

  const totalMinutes = replyTimeMs / (60 * 1000);
  if (totalMinutes < 60) {
    return `${totalMinutes.toFixed(1)} min`;
  }

  const totalHours = totalMinutes / 60;
  if (totalHours < 24) {
    return `${totalHours.toFixed(1)} hr`;
  }

  const totalDays = totalHours / 24;
  return `${totalDays.toFixed(1)} day`;
}

export function formatRate(rate: number | null): string {
  return rate === null ? "N/A" : `${rate}%`;
}

// Size of one stage relative to the stage before it. Null when the earlier
// stage is empty, because there is nothing to compare against.
export function formatConversionRate(
  fromCount: number,
  toCount: number,
): string | null {
  if (fromCount <= 0) return null;
  const rate = (toCount / fromCount) * 100;
  if (!Number.isFinite(rate)) return null;
  return rate >= 10 ? `${Math.round(rate)}%` : `${rate.toFixed(1)}%`;
}
