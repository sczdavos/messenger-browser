// Diagnostic trace for the four navigation layers and the permission handlers.
// Off unless MESSENGER_BROWSER_TRACE_NAV=1, so a blocked flow can be diagnosed
// from the exact URL instead of the dialog's summarised detail line.
const enabled = process.env.MESSENGER_BROWSER_TRACE_NAV === '1';

export function traceEnabled(): boolean {
  return enabled;
}

export function trace(layer: string, outcome: string, url: string): void {
  if (!enabled) return;
  process.stderr.write(
    `[nav] ${layer.padEnd(20)} ${outcome.padEnd(18)} ${url}\n`,
  );
}
