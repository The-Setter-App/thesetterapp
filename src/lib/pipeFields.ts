type PipeValue = string | number | null | undefined;

export function pipeFields(fields: Record<string, PipeValue>): string {
  return Object.entries(fields)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim().length > 0)
    .map(([key, value]) => `${key}=${String(value).trim()}`)
    .join(" | ");
}

