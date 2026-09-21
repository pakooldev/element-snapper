import Link from "next/link";
import { CHROME_STORE_URL } from "./logo";

// Server component: the year is baked in at build time, so there is no
// hydration-only text swap (and no client JS) just to print a number.
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Element Snapper.</p>
          <div className="footer-links">
            <Link href="/privacy">Privacy Policy</Link>
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener">
              Chrome Web Store
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
