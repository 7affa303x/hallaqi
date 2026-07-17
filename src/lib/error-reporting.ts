export function reportClientError(
  error: Error,
  details: { componentStack?: string } = {}
) {
  if (import.meta.env.DEV) return;
  const body = JSON.stringify({
    name: error.name,
    message: error.message.slice(0, 1000),
    stack: error.stack?.slice(0, 4000),
    componentStack: details.componentStack?.slice(0, 4000),
    url: window.location.href,
    userAgent: navigator.userAgent,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch('/api/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}
