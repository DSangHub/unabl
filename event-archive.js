const graceMs = 24 * 60 * 60 * 1000;

// Events have a start time but no end time; give hosts the full day to use their event.
export function groupHostEvents(events, now = Date.now()) {
  const active = [], archived = [];
  for (const event of events) {
    const starts = event.starts_at ? Date.parse(event.starts_at) : NaN;
    (Number.isFinite(starts) && now >= starts + graceMs ? archived : active).push(event);
  }
  const start = event => Date.parse(event.starts_at) || Infinity;
  active.sort((a, b) => start(a) - start(b));
  archived.sort((a, b) => start(b) - start(a));
  return {active, archived};
}
