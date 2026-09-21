"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CHROME_STORE_URL, Logo } from "./logo";

const LINKS = [
  { href: "/#how-it-works", label: "How it Works" },
  { href: "/#features", label: "Features" },
  { href: "/manual", label: "Manual" },
  { href: "/playground", label: "Playground" },
  { href: "/releases", label: "Releases" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          {Logo}
          <span>Element Snapper</span>
        </Link>
        <div className="nav-right">
          <div className={open ? "nav-links is-open" : "nav-links"}>
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={pathname === href ? "active" : undefined}
                style={pathname === href ? { color: "var(--text-primary)" } : undefined}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener" className="btn btn-outline">
              Add to Chrome
            </a>
          </div>
          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
