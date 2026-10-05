export interface SessionGroup<Session> {
  label: string;
  sessions: Session[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

// Buckets chats by how recently they were used, keeping the order they came
// in within each bucket. Empty buckets are left out.
export function groupSessionsByRecency<Session extends { updatedAt: string }>(
  sessions: Session[],
  now: Date,
): SessionGroup<Session>[] {
  const todayStart = startOfDay(now);
  const buckets: SessionGroup<Session>[] = [
    { label: "Today", sessions: [] },
    { label: "Yesterday", sessions: [] },
    { label: "Previous 7 days", sessions: [] },
    { label: "Older", sessions: [] },
  ];

  for (const session of sessions) {
    const updatedAt = new Date(session.updatedAt).getTime();
    // A chat with no usable date is treated as current, not as old.
    if (!Number.isFinite(updatedAt) || updatedAt >= todayStart) {
      buckets[0].sessions.push(session);
    } else if (updatedAt >= todayStart - DAY_MS) {
      buckets[1].sessions.push(session);
    } else if (updatedAt >= todayStart - 7 * DAY_MS) {
      buckets[2].sessions.push(session);
    } else {
      buckets[3].sessions.push(session);
    }
  }

  return buckets.filter((bucket) => bucket.sessions.length > 0);
}
