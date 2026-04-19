import { render } from "preact";
import { useState } from "preact/hooks";
import "../css/main.css";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import DemoModal from "../components/DemoModal";

const platforms = [
  {
    name: "Linux",
    url: "https://solobase.dev/download/linux",
    extract: "tar xz",
    run: "./solobase",
  },
  {
    name: "Linux ARM",
    url: "https://solobase.dev/download/linux-arm",
    extract: "tar xz",
    run: "./solobase",
  },
  {
    name: "macOS",
    url: "https://solobase.dev/download/mac",
    extract: "tar xz",
    run: "./solobase",
  },
  {
    name: "macOS Intel",
    url: "https://solobase.dev/download/mac-intel",
    extract: "tar xz",
    run: "./solobase",
  },
  {
    name: "Windows",
    url: "https://solobase.dev/download/windows",
    extract: null,
    run: "solobase.exe",
  },
];

function CodeBlock() {
  const [active, setActive] = useState(0);
  const p = platforms[active];
  const comment = { color: "#6a9955" };
  const cmd = { color: "#d4d4d4" };

  return (
    <div
      style={{
        borderRadius: "0.5rem",
        overflow: "hidden",
        background: "#1e1e1e",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid #2d2d30",
          overflowX: "auto",
        }}
      >
        {platforms.map((pl, i) => (
          <button
            key={pl.name}
            onClick={() => setActive(i)}
            style={{
              padding: "0.5rem 1rem",
              background: i === active ? "#1e1e1e" : "#252526",
              color: i === active ? "#d4d4d4" : "#6b7280",
              border: "none",
              borderBottom:
                i === active ? "2px solid #fe6627" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            {pl.name}
          </button>
        ))}
      </div>
      <pre
        style={{
          margin: 0,
          padding: "1.25rem 1.5rem",
          fontSize: "0.8rem",
          lineHeight: 1.8,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          color: "#d4d4d4",
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
        }}
      >
        <span style={comment}># Download the latest release</span>
        {"\n"}
        {p.extract ? (
          <>
            <span style={cmd}>{`curl -sSL ${p.url} | ${p.extract}`}</span>
            {"\n"}
          </>
        ) : (
          <>
            <span style={cmd}>{`curl -sSLO ${p.url}`}</span>
            {"\n"}
            <span style={cmd}>{`tar -xf solobase-windows-amd64.zip`}</span>
            {"\n"}
          </>
        )}
        {"\n"}
        <span style={comment}># Run it</span>
        {"\n"}
        <span style={cmd}>{p.run}</span>
        {"\n\n"}
        <span style={comment}>
          {
            "# That's it. Auth, database, storage, products, admin panel — all running on :8090"
          }
        </span>
      </pre>
    </div>
  );
}

function GetStarted() {
  return (
    <section style={{ background: "#ffffff", padding: "0 1.5rem 4rem" }}>
      <div class="max-w-2xl mx-auto">
        <CodeBlock />
        {/* Browser demo — no-install escape hatch */}
        <div
          class="flex flex-col items-center text-center"
          style={{
            marginTop: "2.5rem",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            padding: "2rem 1.5rem",
            background: "#ffffff",
          }}
        >
          <p
            class="text-gray-700"
            style={{
              margin: 0,
              marginBottom: "1.5rem",
              fontSize: "1.125rem",
              lineHeight: 1.5,
            }}
          >
            No time to run a command? I feel you.
          </p>
          <a
            href="https://demo.solobase.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "0.75rem 1.75rem",
              background: "#fe6627",
              color: "white",
              borderRadius: "0.5rem",
              fontWeight: 600,
              fontSize: "1rem",
              transition: "background 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#e55a1f")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#fe6627")}
          >
            Demo website
          </a>
        </div>
      </div>
    </section>
  );
}

function PlatformAgnostic() {
  const items = [
    {
      title: "Run anywhere",
      desc: "Linux, macOS, Windows, or in the browser — that's right, a backend running on the frontend.",
      icon: (
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      ),
    },
    {
      title: "Swap backends freely",
      desc: "Grows and changes with your needs — swap SQLite for Postgres, disk for S3.",
      icon: (
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
    {
      title: "Local-first development",
      desc: "Run a full backend locally in seconds — no cloud accounts, no emulators, no Docker.",
      icon: (
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section style={{ background: "#f9fafb", padding: "4rem 1.5rem" }}>
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-bold text-center text-gray-900 mb-3">
          Platform Agnostic by Design
        </h2>
        <p class="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
          Build once. Deploy anywhere. No lock-in.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              class="bg-white rounded-xl p-6"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <div class="mb-3" style={{ color: "#fe6627" }}>
                {item.icon}
              </div>
              <h3 class="font-semibold text-gray-900 mb-1">{item.title}</h3>
              <p class="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentReady() {
  const points = [
    {
      title: "Code as simple blocks",
      desc: "Every feature is a small block with a clear spec — easy to read, easy to test, easy for an agent to reason about.",
      icon: (
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M4 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 15a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zM13 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V6zM13 15a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z"
          />
        </svg>
      ),
    },
    {
      title: "Spin up per task",
      desc: "Fresh backend in a second. Throw it away when the agent's done.",
      icon: (
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      title: "WASM plugins, sandboxed",
      desc: "Agents can build any block they want — and the sandbox lets you decide exactly how it behaves.",
      icon: (
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section style={{ background: "#ffffff", padding: "4rem 1.5rem" }}>
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-bold text-center text-gray-900 mb-3">
          Built for AI Agents
        </h2>
        <p class="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
          A backend agents can spin up and actually use.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          {points.map((item) => (
            <div
              key={item.title}
              class="rounded-xl p-6"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <div class="mb-3" style={{ color: "#fe6627" }}>
                {item.icon}
              </div>
              <h3 class="font-semibold text-gray-900 mb-1">{item.title}</h3>
              <p class="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCTA({ onOpenDemo }) {
  return (
    <section style={{ background: "#f9fafb", padding: "4rem 1.5rem" }}>
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">
          Ready to get started?
        </h2>
        <div class="flex justify-center gap-4 flex-wrap">
          <a
            href="https://demo.solobase.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "0.75rem 2rem",
              background: "#1f2937",
              color: "white",
              borderRadius: "0.5rem",
              fontWeight: 600,
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#374151")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#1f2937")}
          >
            Demo
          </a>
          <a
            href="/docs/"
            style={{
              display: "inline-block",
              padding: "0.75rem 2rem",
              background: "white",
              color: "#1f2937",
              border: "2px solid #e5e7eb",
              borderRadius: "0.5rem",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "#1f2937";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            Read the documentation
          </a>
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <Header onOpenDemo={() => setDemoOpen(true)} />
      <main>
        <div class="text-center pt-6 px-6" style={{ background: '#ffffff' }}>
          <a
            href="/notes/"
            class="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{
              padding: '0.375rem 0.875rem',
              border: '1px solid #fed7aa',
              background: '#fff7ed',
              color: '#c2410c',
              borderRadius: '9999px',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#ffedd5';
              e.currentTarget.style.borderColor = '#fdba74';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#fff7ed';
              e.currentTarget.style.borderColor = '#fed7aa';
            }}
          >
            <span style={{ fontSize: '0.9rem' }}>⚠️</span>
            Important notes — click me to read
          </a>
        </div>
        <Hero />
        <GetStarted />
        <PlatformAgnostic />
        <AgentReady />
        <BottomCTA onOpenDemo={() => setDemoOpen(true)} />
      </main>
      <Footer />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}

render(<HomePage />, document.getElementById("app"));
