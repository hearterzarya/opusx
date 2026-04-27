 "use client";

import { useEffect, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

const sections = [
  { id: "01", label: "01 What this is" },
  { id: "02", label: "02 Quick start" },
  { id: "03", label: "03 Authentication" },
  { id: "04", label: "04 Models" },
  { id: "05", label: "05 Messages API" },
  { id: "06", label: "06 Streaming" },
  { id: "07", label: "07 IDE setup" },
  { id: "08", label: "08 OpenAI-compatible" },
  { id: "09", label: "09 Errors & limits" },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("01");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.5, 0.8],
      },
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 gap-10 px-6 py-10 md:py-12">
        <aside className="mono sticky top-20 hidden h-fit w-64 space-y-2 border-r border-[var(--border)] pr-6 text-sm text-[var(--text-muted)] md:block">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`block rounded-md px-2 py-1 transition-colors ${
                activeSection === section.id
                  ? "bg-[var(--surface)] text-[var(--text)]"
                  : "hover:bg-[var(--surface)] hover:text-[var(--text)]"
              }`}
            >
              {section.label}
            </a>
          ))}
        </aside>

        <article className="docs-prose flex-1 space-y-14">
          <header className="space-y-4">
            <p className="section-marker">§ Documentation</p>
            <h1 className="display-italic text-5xl md:text-6xl">How to use it.</h1>
            <p className="max-w-3xl text-base text-[var(--text-muted)] md:text-lg">
              Everything you need to wire up OpusX: base URLs, authentication, models, streaming, and IDE setup.
            </p>
          </header>

          <section id="01" className="space-y-4">
            <p className="section-marker">§ 01 — What this is</p>
            <h2 className="display-italic text-3xl md:text-4xl">What this is.</h2>
            <p className="text-[var(--text-muted)]">
              OpusX is an Anthropic-compatible proxy. It speaks the same `/v1/messages` protocol Claude does, accepts the same headers, and returns the same SSE events.
            </p>
            <pre className="mono card bg-[var(--code-bg)] p-5 text-sm">https://api.opusx.pro</pre>
          </section>

          <section id="02" className="space-y-4">
            <p className="section-marker">§ 02 — Quick start</p>
            <h2 className="display-italic text-3xl md:text-4xl">Quick start.</h2>
            <pre className="mono card bg-[var(--code-bg)] p-5 text-sm">{`npx opusx
curl -fsSL https://opusx.pro/setup.sh | bash
irm https://opusx.pro/setup.ps1 | iex`}</pre>
          </section>

          <section id="03" className="space-y-4">
            <p className="section-marker">§ 03 — Authentication</p>
            <h2 className="display-italic text-3xl md:text-4xl">Authentication.</h2>
            <pre className="mono card bg-[var(--code-bg)] p-5 text-sm">{`curl https://api.opusx.pro/v1/messages \\
  -H "x-api-key: sk-ant-ox-..." \\
  -H "anthropic-version: 2023-06-01"
  -d '{"model":"claude-sonnet-4-6","max_tokens":256,"messages":[{"role":"user","content":"Hello"}]}'`}</pre>
          </section>

          <section id="04" className="space-y-4">
            <p className="section-marker">§ 04 — Models</p>
            <h2 className="display-italic text-3xl md:text-4xl">Models.</h2>
            <p className="text-[var(--text-muted)]">Any model Anthropic publishes can be requested through OpusX.</p>
            <pre className="mono card bg-[var(--code-bg)] p-5 text-sm">curl https://api.opusx.pro/v1/models -H &quot;x-api-key: sk-ant-ox-...&quot;</pre>
          </section>

          <section id="05" className="space-y-4">
            <p className="section-marker">§ 05 — Messages API</p>
            <h2 className="display-italic text-3xl md:text-4xl">Messages API.</h2>
            <p className="text-[var(--text-muted)]">Identical shape to Anthropic&apos;s `/v1/messages` with prompt caching support.</p>
          </section>

          <section id="06" className="space-y-4">
            <p className="section-marker">§ 06 — Streaming</p>
            <h2 className="display-italic text-3xl md:text-4xl">Streaming.</h2>
            <pre className="mono card bg-[var(--code-bg)] p-5 text-sm">{`event: message_start
data: {"type":"message_start","message":{"id":"msg_..."}}

event: message_delta
data: {"type":"message_delta","delta":{"text":"Hello"}}`}</pre>
          </section>

          <section id="07" className="space-y-4">
            <p className="section-marker">§ 07 — IDE setup</p>
            <h2 className="display-italic text-3xl md:text-4xl">IDE setup.</h2>
            <p className="text-[var(--text-muted)]">
              Claude Code uses settings JSON. Cursor can use OpenAI-compatible mode with base URL `https://api.opusx.pro/v1`.
            </p>
          </section>

          <section id="08" className="space-y-4">
            <p className="section-marker">§ 08 — OpenAI-compatible</p>
            <h2 className="display-italic text-3xl md:text-4xl">OpenAI-compatible.</h2>
            <pre className="mono card bg-[var(--code-bg)] p-5 text-sm">POST /v1/chat/completions</pre>
          </section>

          <section id="09" className="space-y-4">
            <p className="section-marker">§ 09 — Errors & limits</p>
            <h2 className="display-italic text-3xl md:text-4xl">Errors & limits.</h2>
            <ul className="list-disc space-y-1.5 pl-6 text-[var(--text-muted)]">
              <li>401 — Key missing, invalid, or disabled</li>
              <li>429 — Per-minute rate limit (check `Retry-After`)</li>
              <li>400 — Malformed request</li>
              <li>Window/budget limit — 200 with budget-exceeded style message</li>
            </ul>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
