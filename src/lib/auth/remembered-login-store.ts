"use client";

/**
 * "Lembrar meus dados de acesso" no login — guarda só CNPJ + e-mail
 * (nunca a senha) em localStorage, pra pré-preencher o formulário na
 * próxima visita. A senha continua responsabilidade do gerenciador de
 * senha nativo do navegador (autoComplete="username"/"current-password"
 * no formulário), nunca guardada por este app.
 *
 * Padrão de external store (useSyncExternalStore) — mesmo usado em
 * `sidebar-collapse-store.ts` — pra ler localStorage sem causar
 * divergência de hidratação entre servidor e cliente.
 */

const STORAGE_KEY = "rh-eleitoral:remembered-login";

export interface RememberedLogin {
  documentNumber: string;
  email: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function readFromStorage(): RememberedLogin | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedLogin>;
    if (typeof parsed.documentNumber === "string" && typeof parsed.email === "string") {
      return { documentNumber: parsed.documentNumber, email: parsed.email };
    }
    return null;
  } catch {
    return null;
  }
}

let cache: RememberedLogin | null | undefined;

export function getRememberedLoginSnapshot(): RememberedLogin | null {
  if (cache === undefined) {
    cache = readFromStorage();
  }
  return cache;
}

export function getRememberedLoginServerSnapshot(): RememberedLogin | null {
  return null;
}

export function subscribeRememberedLogin(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setRememberedLogin(value: RememberedLogin | null) {
  cache = value;
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage indisponível (modo privado, storage bloqueado) —
    // segue sem persistir, o formulário só não vem pré-preenchido.
  }
  for (const listener of listeners) listener();
}
