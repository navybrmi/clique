/** localStorage key holding the user's explicit theme choice. */
export const THEME_STORAGE_KEY = "clique-theme"

/**
 * Resolves whether dark mode should be active.
 *
 * An explicit stored choice wins; otherwise the system preference applies.
 *
 * @param stored - Value from localStorage ("light" | "dark" | anything else = no choice)
 * @param systemPrefersDark - Result of the prefers-color-scheme media query
 * @returns True when the dark theme should be applied
 */
export function resolveIsDark(
  stored: string | null,
  systemPrefersDark: boolean
): boolean {
  return stored === "dark" || (stored !== "light" && systemPrefersDark)
}

/**
 * Inline bootstrap executed before hydration so the correct theme class is on
 * <html> at first paint (no light-mode flash for dark-theme users). Must stay
 * dependency-free and swallow storage errors (private browsing).
 */
export const themeBootstrapScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`
