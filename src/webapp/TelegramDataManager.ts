const TOKEN_KEY = 'telebook_jwt';

/**
 * Bootstrap Telegram WebApp authentication.
 * Reads initData, requests backend JWT and hooks fetch with Authorization header.
 */
export async function bootstrapTelegramWebApp() {
  const webApp = (window as any).Telegram?.WebApp;
  const initDataRaw = webApp?.initData || '';

  const res = await fetch('/telebook/api/tg-bootstrap.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({initDataRaw})
  });

  const data = await res.json();
  if(!data.ok) {
    throw new Error(data.error || 'bootstrap_failed');
  }

  if(data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {});
    const token = localStorage.getItem(TOKEN_KEY);
    if(token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return originalFetch(input, {...init, headers});
  };

  return data;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

