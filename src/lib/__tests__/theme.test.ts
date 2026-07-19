import { resolveIsDark, themeBootstrapScript, THEME_STORAGE_KEY } from "@/lib/theme"

describe("resolveIsDark", () => {
  it("honors an explicit dark choice regardless of system preference", () => {
    expect(resolveIsDark("dark", false)).toBe(true)
    expect(resolveIsDark("dark", true)).toBe(true)
  })

  it("honors an explicit light choice regardless of system preference", () => {
    expect(resolveIsDark("light", true)).toBe(false)
    expect(resolveIsDark("light", false)).toBe(false)
  })

  it("falls back to the system preference when nothing is stored", () => {
    expect(resolveIsDark(null, true)).toBe(true)
    expect(resolveIsDark(null, false)).toBe(false)
  })

  it("treats unknown stored values as no choice", () => {
    expect(resolveIsDark("banana", true)).toBe(true)
    expect(resolveIsDark("banana", false)).toBe(false)
  })
})

describe("themeBootstrapScript", () => {
  it("references the shared storage key", () => {
    expect(themeBootstrapScript).toContain(THEME_STORAGE_KEY)
  })

  it("toggles the dark class on the document element", () => {
    expect(themeBootstrapScript).toContain('classList.toggle("dark"')
  })

  it("mirrors resolveIsDark semantics when executed", () => {
    const runScript = (stored: string | null, prefersDark: boolean) => {
      const localStorage = { getItem: () => stored }
      const matchMedia = () => ({ matches: prefersDark })
      let toggled: boolean | undefined
      const documentElement = {
        classList: { toggle: (_cls: string, on: boolean) => { toggled = on } },
      }
      new Function("localStorage", "window", "document", themeBootstrapScript)(
        localStorage,
        { matchMedia },
        { documentElement }
      )
      return toggled
    }

    expect(runScript("dark", false)).toBe(true)
    expect(runScript("light", true)).toBe(false)
    expect(runScript(null, true)).toBe(true)
    expect(runScript(null, false)).toBe(false)
  })
})
