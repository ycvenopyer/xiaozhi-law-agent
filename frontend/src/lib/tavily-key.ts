const keyFor = (accountId: string) => `xiaozhi-tavily-key:${accountId}`;

export function getTavilyKey(accountId: string) {
  try {
    return sessionStorage.getItem(keyFor(accountId)) || '';
  } catch {
    return '';
  }
}

export function setTavilyKey(accountId: string, apiKey: string) {
  if (apiKey) sessionStorage.setItem(keyFor(accountId), apiKey);
  else sessionStorage.removeItem(keyFor(accountId));
}
