/** Shared geometry for day/week calendar time-grid rendering. */

/** Hour range to display (inclusive) */
export const START_HOUR = 7;
export const END_HOUR = 20;

/** Pixel height per hour row */
export const HOUR_HEIGHT = 60;

/** Minimum rendered height — snaps to a full hour row so all short events look the same */
export const MIN_EVENT_HEIGHT = HOUR_HEIGHT - 2;

/**
 * Returns top offset & height in pixels for an event in the time grid.
 * Returns null if the event is entirely outside the visible window.
 */
export function getEventStyle(
  startHour: number,
  duration: number,
): { top: number; height: number } | null {
  const end = startHour + duration;

  if (end <= START_HOUR || startHour >= END_HOUR + 1) return null;

  const s = Math.max(startHour, START_HOUR);
  const e = Math.min(end, END_HOUR + 1);

  const top = (s - START_HOUR) * HOUR_HEIGHT + 1;
  const height = Math.max((e - s) * HOUR_HEIGHT - 2, MIN_EVENT_HEIGHT);

  return { top, height };
}

/* ─── Overlap Layout (Google Calendar-style side-by-side) ─── */

export interface OverlapLayout {
  /** Which column (0-indexed) this event sits in */
  column: number;
  /** Total columns in the overlap cluster */
  totalColumns: number;
}

/**
 * Given a list of events for a single day, determines how to lay them out
 * side-by-side when they overlap — exactly like Google Calendar.
 *
 * Returns a Map of event id → { column, totalColumns }.
 */
export function computeOverlapLayout(
  events: { id: string; startHour: number; duration: number }[],
): Map<string, OverlapLayout> {
  if (events.length === 0) return new Map();

  // Sort by start time, then longer events first
  const sorted = [...events].sort((a, b) => {
    if (a.startHour !== b.startHour) return a.startHour - b.startHour;
    return b.duration - a.duration;
  });

  // Greedily place each event into the first available column
  type Placed = { id: string; start: number; end: number; col: number };
  const placed: Placed[] = [];
  const colEnds: number[] = [];

  for (const ev of sorted) {
    const end = ev.startHour + Math.max(ev.duration, MIN_EVENT_HEIGHT / HOUR_HEIGHT);

    let col = -1;
    for (let c = 0; c < colEnds.length; c++) {
      if (ev.startHour >= colEnds[c]) {
        col = c;
        break;
      }
    }

    if (col === -1) {
      col = colEnds.length;
      colEnds.push(end);
    } else {
      colEnds[col] = end;
    }

    placed.push({ id: ev.id, start: ev.startHour, end, col });
  }

  // Find connected overlap clusters (transitively overlapping events)
  const clusters: Placed[][] = [];

  for (const p of placed) {
    let merged = false;
    for (const cluster of clusters) {
      if (cluster.some((q) => p.start < q.end && p.end > q.start)) {
        cluster.push(p);
        merged = true;
        break;
      }
    }
    if (!merged) {
      clusters.push([p]);
    }
  }

  // Each cluster's totalColumns = max column index + 1
  const result = new Map<string, OverlapLayout>();
  for (const cluster of clusters) {
    const totalColumns = Math.max(...cluster.map((p) => p.col)) + 1;
    for (const p of cluster) {
      result.set(p.id, { column: p.col, totalColumns });
    }
  }

  return result;
}
