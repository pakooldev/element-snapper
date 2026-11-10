"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/** Chrome that only turns fixed or appears once the page has been scrolled. */
export function LateFixed() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setStage(y > 1200 ? 3 : y > 600 ? 2 : y > 200 ? 1 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* The wrapper keeps the header's height so the page doesn't jump when it turns fixed. */}
      <div className="pg-late-slot">
        <div className={stage >= 1 ? "pg-late-header is-fixed" : "pg-late-header"}>
          Header (fixed after 200px)
        </div>
      </div>
      {stage >= 2 && <div className="pg-late-chip pg-late-top">Back to top (after 600px)</div>}
      {stage >= 3 && <div className="pg-late-chip pg-late-popup">Subscribe popup (after 1200px)</div>}
    </>
  );
}

/** Markup in a shadow root, out of reach of document.querySelectorAll and elementFromPoint. */
export function ShadowContent({ html }: { html: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current || host.current.shadowRoot) return;
    host.current.attachShadow({ mode: "open" }).innerHTML = html;
  }, [html]);

  return <div ref={host} />;
}

/** Shows how many presses reached the page, the way a page's own script would see them. */
export function PressCounter() {
  const [presses, setPresses] = useState(0);

  useEffect(() => {
    const count = () => setPresses((n) => n + 1);
    const events = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
    events.forEach((name) => document.addEventListener(name, count, true));
    return () => events.forEach((name) => document.removeEventListener(name, count, true));
  }, []);

  return (
    <p data-presses={presses} className="pg-press-count">
      Presses the page saw: {presses}
    </p>
  );
}

/** Blocks that fade in once they scroll into view, the way many landing pages reveal content. */
export function FadeInBlocks({ count, gap }: { count: number; gap: number }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) entry.target.classList.add("is-shown");
    });
    root.current?.querySelectorAll(".pg-fade").forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="pg-fade" style={{ marginTop: gap }}>
          Fades in · block {i + 1}
        </div>
      ))}
    </div>
  );
}

/** A feed that adds another screen of posts whenever it is scrolled near its end. */
export function InfiniteFeed() {
  const [pages, setPages] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const rest = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (rest < 400) setPages((n) => n + 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {Array.from({ length: pages }, (_, i) => (
        <div key={i} className="pg-feed-more">
          Loaded on scroll · page {i + 1}
        </div>
      ))}
    </>
  );
}

/** Opens its children in a modal <dialog>, which the browser draws in the top layer. */
export function ModalDialog({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  return (
    <dialog ref={dialog} className="pg-dialog" aria-label="Top layer test">
      {children}
    </dialog>
  );
}

