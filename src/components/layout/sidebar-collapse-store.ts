"use client";

/**
 * Estado "recolhida/aberta" da barra lateral (manual de identidade
 * visual, seção 6.1 — 240px aberta / 72px recolhida). É só conveniência
 * de dispositivo, não dado do usuário no banco, então vive em
 * localStorage. Implementado como external store (`useSyncExternalStore`)
 * em vez de `useState` + `useEffect` pra ler na montagem — evita o
 * mismatch de hidratação e a cascata de re-render que o lint do projeto
 * já rejeita (`react-hooks/set-state-in-effect`).
 */
const STORAGE_KEY = "rh-eleitoral:sidebar-collapsed";

let currentValue = false;
let initialized = false;
const listeners = new Set<() => void>();

function readFromStorage(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function getSidebarCollapsedSnapshot(): boolean {
  if (!initialized) {
    currentValue = readFromStorage();
    initialized = true;
  }
  return currentValue;
}

export function getSidebarCollapsedServerSnapshot(): boolean {
  return false;
}

export function subscribeSidebarCollapsed(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSidebarCollapsed(next: boolean): void {
  currentValue = next;
  initialized = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // só conveniência — segue sem persistir se localStorage não der.
  }
  for (const listener of listeners) listener();
}
