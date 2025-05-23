"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  attribute = "data-theme",
  enableSystem = true,
  disableTransitionOnChange = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    const root = window.document.documentElement
    const initialColorValue = root.style.getPropertyValue("--initial-color-mode")

    const savedTheme = localStorage.getItem(storageKey)
    if (savedTheme) {
      setTheme(savedTheme as Theme)
    } else if (initialColorValue === "dark") {
      setTheme("dark")
    } else if (enableSystem) {
      setTheme("system")
    }
  }, [enableSystem, storageKey])

  useEffect(() => {
    const root = window.document.documentElement

    if (disableTransitionOnChange) {
      root.classList.add("no-transitions")
      
      const _ = window.getComputedStyle(root).opacity
      
      requestAnimationFrame(() => {
        root.classList.remove("no-transitions")
      })
    }

    if (attribute === "class") {
      root.classList.remove("light", "dark")
      
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        root.classList.add(systemTheme)
      } else {
        root.classList.add(theme)
      }
    } else {
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        root.setAttribute(attribute, systemTheme)
      } else {
        root.setAttribute(attribute, theme)
      }
    }
  }, [theme, attribute, disableTransitionOnChange])

  useEffect(() => {
    if (theme === "system") return

    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    
    const handleChange = () => {
      if (theme === "system") {
        const root = window.document.documentElement
        if (attribute === "class") {
          root.classList.remove("light", "dark")
          root.classList.add(mediaQuery.matches ? "dark" : "light")
        } else {
          root.setAttribute(attribute, mediaQuery.matches ? "dark" : "light")
        }
      }
    }
    
    mediaQuery.addEventListener("change", handleChange)
    
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [attribute, theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
