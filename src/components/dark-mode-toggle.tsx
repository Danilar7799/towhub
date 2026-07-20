"use client";

import { useState, useEffect } from "react";

export function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("towhub_theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("towhub_theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="relative w-10 h-5 rounded-full transition-colors duration-200 flex items-center"
      style={{ backgroundColor: dark ? "#533afd" : "#e5edf5" }}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <div
        className="absolute w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"
        style={{ transform: dark ? "translateX(22px)" : "translateX(2px)" }}
      />
      <span className="text-[10px] absolute" style={{ left: dark ? "5px" : "auto", right: dark ? "auto" : "5px" }}>
        {dark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
