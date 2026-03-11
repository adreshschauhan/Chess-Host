import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getTheme, setTheme, type Theme } from "../theme";

export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="btn"
      title={`Switch to ${next} theme`}
      onClick={() => {
        setTheme(next);
        setThemeState(next);
      }}
    >
      {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
