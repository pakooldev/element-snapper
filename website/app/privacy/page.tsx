import type { Metadata } from "next";
import { GlowCursor } from "@/components/glow-cursor";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for the Element Snapper Chrome Extension.",
};

export default function Privacy() {
  return (
    <main className="container">
      <GlowCursor />
      <div className="privacy-container glass-panel">
        <h1>Privacy Policy</h1>
        <div className="update-date">Last updated: March 2, 2026</div>

        <p>
          Element Snapper (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to
          protecting your privacy. This Privacy Policy explains our practices regarding your data
          when you use the Element Snapper Chrome extension (&quot;Extension&quot;).
        </p>

        <h2>1. Zero Data Collection</h2>
        <p>
          Element Snapper is designed with privacy at its core.{" "}
          <strong>
            We do not collect, transmit, distribute, or sell any of your personal data.
          </strong>{" "}
          The Extension operates entirely on your local device within your browser.
        </p>

        <h2>2. Data Processing</h2>
        <p>
          The Extension works by taking screenshots of your current browser viewport. This
          functionality requires access to the tab you are currently viewing. However, all image
          processing, cropping, and stitching occur locally in your browser memory.
        </p>
        <ul>
          <li>Screenshots are never uploaded to our servers.</li>
          <li>Screenshots are saved directly to your local device.</li>
          <li>No analytics or telemetry are gathered about your browsing habits.</li>
        </ul>

        <h2>3. Permissions Explained</h2>
        <p>
          The Extension requires the following Chrome permissions strictly to function correctly:
        </p>
        <ul>
          <li>
            <strong>
              <code>activeTab</code>
            </strong>
            : To inject the element selection interface and perform the actual screenshot capture.
          </li>
          <li>
            <strong>
              <code>downloads</code>
            </strong>
            : To save the cropped screenshot files directly to your hard drive.
          </li>
          <li>
            <strong>
              <code>storage</code>
            </strong>
            : To save your local preferences (like output mode, format, and keyboard shortcuts).
            This data stays locally on your device.
          </li>
          <li>
            <strong>
              <code>scripting</code>
            </strong>
            : To inject the capture UI (element selector, region selector, and floating panel) into
            the page you&apos;re viewing.
          </li>
          <li>
            <strong>
              <code>clipboardWrite</code>
            </strong>
            : To copy the captured screenshot — or, in &quot;Copy as Prompt&quot; mode, a text
            description of the selected element — directly to your clipboard when you choose that
            output mode instead of downloading.
          </li>
        </ul>

        <h2>4. Third-Party Services</h2>
        <p>
          The Extension does not use any third-party services, analytics platforms, or external
          APIs to function.
        </p>

        <h2>5. Changes to This Policy</h2>
        <p>
          If we make modifications to how the Extension handles data in the future, we will update
          this Privacy Policy accordingly and reflect the &quot;Last updated&quot; date.
        </p>

        <h2>6. Contact Us</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy, please contact us via the
          Chrome Web Store support tab.
        </p>
      </div>
    </main>
  );
}
