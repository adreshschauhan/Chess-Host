export type Theme = "dark" | "light";

const THEME_KEY = "theme";

export function getTheme(): Theme {
  const raw = (localStorage.getItem(THEME_KEY) ?? "dark").toLowerCase();
  return raw === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getTheme());
}
