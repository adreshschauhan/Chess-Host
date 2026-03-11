export type ApiError = { error: string };

export type Role = "user" | "admin";

const ROLE_KEY = "role";
const ADMIN_TOKEN_KEY = "adminToken";

export function getRole(): Role {
  const v = (localStorage.getItem(ROLE_KEY) ?? "user").toLowerCase();
  return v === "admin" ? "admin" : "user";
}

export function setRole(role: Role) {
  localStorage.setItem(ROLE_KEY, role);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
}

export function setAdminToken(token: string) {
  if (!token.trim()) localStorage.removeItem(ADMIN_TOKEN_KEY);
  else localStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
}

export function isAdmin() {
  return getAdminToken().trim().length > 0;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const token = getAdminToken();
  if (token) headers.set("x-admin-token", token);

  const res = await fetch(path, { ...init, headers });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as ApiError;
      if (body?.error) msg = body.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

export async function apiFetchForm<T>(path: string, form: FormData, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  const token = getAdminToken();
  if (token) headers.set("x-admin-token", token);

  const res = await fetch(path, { ...init, method: init.method ?? "POST", headers, body: form });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as ApiError;
      if (body?.error) msg = body.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return (await res.json()) as T;
}
