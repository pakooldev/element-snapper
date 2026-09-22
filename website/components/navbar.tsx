"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Subscribe to the derived boolean, not scrollY — React bails out when the
    // value is unchanged, so this re-renders twice per page (crossing the
    // threshold each way) rather than on every scroll frame.
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // catch a restored scroll position or an #anchor load
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The open mobile menu keeps the bar solid: its dropdown hangs directly off
  // the bar, and a transparent one leaves the panel floating on nothing.
  const floating = scrolled || open;

  // Smooth scrolling lives here rather than on `html`, where it also caught
  // Next's scroll-into-view on route change and animated every navigation up
  // from the previous page's scroll position (see globals.css). Only a
  // same-page anchor animates; a cross-page one falls through to Next, which
  // jumps straight to the section.
  const handleNavClick = (href: string) => (e: React.MouseEvent) => {
    setOpen(false);
    const [path, hash] = href.split("#");
    if (!hash || pathname !== (path || "/")) return;
    e.preventDefault();
    document.getElementById(hash)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <nav className={floating ? "navbar is-scrolled" : "navbar"}>
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
                onClick={handleNavClick(href)}
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
