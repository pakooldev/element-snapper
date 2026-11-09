"use client";

import { useEffect, useRef } from "react";
import panel from "@/generated/panel-ui.json";

type Props = {
  view?: "home" | "settings";
  /** Callouts for the manual: CSS selector inside the panel -> letter. */
  badges?: Record<string, string>;
  /** Initial control values by id: true checks a box, a string sets an input's value. */
  fields?: Record<string, string | true>;
  inert?: boolean;
};

// :host stops the site's inherited text styles (line-height, text-align) crossing
// into the shadow root; the extension's host sits outside <body> and never gets them.
// The extension sizes the views with JS. Here they lay out on their own, so the
// page reserves the right height before any script runs.
const LAYOUT_CSS = `
  :host { all: initial; display: block; }
  .view { position: relative; }
  .header.draggable { cursor: default; }
`;

const VIEW_CSS = {
  home: `.view-settings { display: none; }`,
  settings: `
    .view-home, #qualityGroup { display: none; } /* Quality only applies to JPG, and PNG is the default */
    .view-settings { transform: none; }
  `,
};

const badgeCss = (selector: string, letter: string) => `
  ${selector} { position: relative; }
  ${selector}::after {
    content: "${letter}";
    position: absolute; top: -8px; right: -8px; z-index: 5;
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; border-radius: 50%;
    background: #3b82f6; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
    color: white; font-size: 11px; font-weight: 700; line-height: 1;
    letter-spacing: 0; text-transform: none;
  }
`;

function buildMarkup({ view = "home", badges = {}, fields = {} }: Props) {
  let html = panel.html;
  for (const [id, value] of Object.entries(fields)) {
    if (!html.includes(`id="${id}"`)) throw new Error(`RealPanel: the panel has no #${id}`);
    html = html.replace(`id="${id}"`, `id="${id}" ${value === true ? "checked" : `value="${value}"`}`);
  }
  const badgeRules = Object.entries(badges).map(([selector, letter]) => badgeCss(selector, letter));
  // Server HTML only: Chrome warns about this attribute in innerHTML, where it does nothing anyway.
  const shadowAttribute = typeof window === "undefined" ? ' shadowrootmode="open"' : "";
  return `<template${shadowAttribute}><style>${panel.css}${LAYOUT_CSS}${VIEW_CSS[view]}${badgeRules.join("")}</style>${html}</template>`;
}

/**
 * The extension's real panel (content/panel.js, via scripts/sync-panel.mjs) in
 * a shadow root, as in the extension. Only its behavior is left out, because
 * that code needs the chrome.* APIs. A page can wire up the shadow root itself:
 * a parent's effect runs after this one, so the root exists by then.
 */
export function RealPanel(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const { badges } = props;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    // The browser builds the shadow root from server HTML, but not from the
    // innerHTML React sets when this mounts after a client-side navigation.
    let root = el.shadowRoot;
    if (!root) {
      root = el.attachShadow({ mode: "open" });
      root.append(el.querySelector("template")!.content.cloneNode(true));
    }

    for (const selector of Object.keys(badges ?? {})) {
      if (!root.querySelector(selector)) console.error(`RealPanel: no badge target for ${selector}`);
    }
  }, [badges]);

  return (
    <div
      ref={host}
      className="real-panel"
      inert={props.inert}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: buildMarkup(props) }}
    />
  );
}
