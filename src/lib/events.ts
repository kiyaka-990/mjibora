// In-memory pub/sub for the SSE live agent feed.
export interface Event { at: string; agent: string; msg: string }

type Sub = (e: Event) => void;
const subs = new Set<Sub>();
let log: Event[] = [];

export function emit(agent: string, msg: string): void {
  const e: Event = { at: new Date().toISOString(), agent, msg };
  log.push(e);
  if (log.length > 200) log.shift();
  subs.forEach((fn) => fn(e));
}

export function subscribe(fn: Sub): () => void {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

export function recent(): Event[] {
  return log.slice(-50);
}
