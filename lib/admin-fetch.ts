/** Same-origin session cookies stay HttpOnly. Never store credentials in client storage. */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await window.fetch(input, { ...init, cache: "no-store" });
  if (response.status === 401)
    window.dispatchEvent(new Event("studio-session-expired"));
  if (response.ok && init?.method && init.method !== "GET") {
    window.dispatchEvent(new Event("studio-saved"));
  }
  return response;
}
