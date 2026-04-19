import { render } from 'preact';
import '../css/main.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UseCaseCard from '../components/UseCaseCard';
import { groups, useCases } from '../data/use-cases';

const faqs = [
  {
    q: 'Why another backend?',
    a: "Because the existing options either cost a fortune at scale, lock you into one cloud, or make you glue together five services just to ship a login form. Solobase is one thing you run, wherever you run it.",
  },
  {
    q: 'How is this different from Pocketbase, Supabase, Google, or AWS?',
    a: "Pocketbase is the closest in spirit — single Go binary, batteries included. Solobase goes further: it also compiles to WebAssembly so a full backend can run in a browser tab, and plugins are sandboxed WASM modules rather than Go code. Supabase, Google, and AWS are hosted platforms; Solobase is a binary you own and can host wherever you want — no provider lock-in.",
  },
  {
    q: 'Is it production-ready?',
    a: "Honestly? Not yet. It's experimental, actively developed, and — as the notes page will cheerfully admit — mostly vibe-coded after hours. Great for prototypes, internal tools, and side projects. Please don't run your next startup on it until we tell you it's safe.",
  },
  {
    q: 'Why both a binary and WASM?',
    a: "Because \"where your backend runs\" shouldn't be an architectural decision you make on day one. Need a real server? Run the binary. Want a zero-infrastructure demo, offline-first app, or per-PR preview? Serve the WASM. Same code either way.",
  },
  {
    q: 'How do plugins stay safe?',
    a: "Plugins are WebAssembly modules running in a sandbox with no filesystem, no network, and no surprise side effects — only what you explicitly expose to them. Installing one stops being a gamble with your server.",
  },
  {
    q: 'Is it open source?',
    a: "Yes — MIT-licensed, on GitHub, no hosted-only features. Self-host it, fork it, embed it in your own product.",
  },
];

function WhyPage() {
  return (
    <>
      <Header />
      <main>
        {/* Why this exists */}
        <section class="max-w-3xl mx-auto px-6 py-16 sm:py-20 text-center">
          <h1 class="text-responsive-xl font-bold text-gray-800 mb-8 leading-tight">
            Why this <span style={{ color: 'var(--primary)' }}>exists</span>
          </h1>
          <div class="space-y-5 text-gray-600 text-lg leading-relaxed">
            <p>
              Every time I start a new project — for a client, for a hackathon,
              for fun — the first questions are always the same. What stack am
              I using? Where am I hosting it? Is this going in a Docker
              container somewhere? How do I set up my dev environment? And
              where's my credit card, because I'm about to type it into six
              different services just to ship a program nobody may ever use.
            </p>
            <p>
              Every time, I'd ask myself the same thing: why is this such a
              pain? Why can't I just go straight into coding my idea?
            </p>
            <p>
              That's why Solobase exists.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section class="bg-white border-y border-gray-200">
          <div class="max-w-3xl mx-auto px-6 py-16">
            <div class="space-y-3">
              {faqs.map((item, i) => (
                <details
                  key={i}
                  class="group rounded-lg border border-gray-200 bg-white transition-colors hover:border-gray-300"
                >
                  <summary class="flex items-center justify-between gap-4 cursor-pointer list-none p-5 font-semibold text-gray-800">
                    <span>{item.q}</span>
                    <span
                      class="flex-shrink-0 transition-transform duration-200 group-open:rotate-45"
                      style={{ color: 'var(--primary)', fontSize: '1.5rem', lineHeight: 1 }}
                    >
                      +
                    </span>
                  </summary>
                  <div class="px-5 pb-5 text-gray-600 leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases intro */}
        <section class="max-w-3xl mx-auto px-6 pt-16 pb-4 text-center">
          <h2 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
            What you can build with it
          </h2>
          <p class="text-gray-500">
            Same codebase, different shapes. A binary on a server, or a full
            backend in a browser tab.
          </p>
        </section>

        {/* Group pills */}
        <div class="flex justify-center gap-3 px-6 pb-12 flex-wrap">
          {groups.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              class="px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-80"
              style={{
                background: g.color.pillBg,
                border: `2px solid ${g.color.pillBorder}`,
                color: g.color.pillBorder,
              }}
            >
              {g.label}
            </a>
          ))}
        </div>

        {/* Sections */}
        {groups.map((g, i) => {
          const items = useCases.filter((uc) => uc.group === g.id);
          return (
            <div key={g.id}>
              {i > 0 && (
                <hr class="border-t border-gray-200 max-w-6xl mx-auto" />
              )}
              <section
                id={g.id}
                class="max-w-6xl mx-auto px-6 py-12 scroll-mt-20"
              >
                <div class="flex items-center gap-3 mb-2">
                  <div
                    class="w-3 h-3 rounded-full"
                    style={{ background: g.color.dot }}
                  />
                  <h2 class="text-2xl sm:text-3xl font-bold text-gray-800">
                    {g.heading}
                  </h2>
                </div>
                <p class="text-gray-500 mb-8">{g.subtitle}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map((uc) => (
                    <UseCaseCard
                      key={uc.title}
                      title={uc.title}
                      description={uc.description}
                      tagLabel={g.tag}
                      color={g.color}
                    />
                  ))}
                </div>
              </section>
            </div>
          );
        })}

        {/* Bottom CTA */}
        <section class="text-center py-16 bg-gray-50">
          <h2 class="text-responsive-lg font-bold text-gray-800 mb-3">
            Ready to build?
          </h2>
          <p class="text-gray-500 text-lg mb-6">
            Same codebase, everywhere. Run it as a binary or drop it in a
            browser.
          </p>
          <div class="flex justify-center gap-3 flex-wrap">
            <a
              href="https://demo.solobase.dev"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: 'var(--primary)' }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = 'var(--primary-hover)')
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = 'var(--primary)')
              }
            >
              Try in Browser
            </a>
            <a
              href="/"
              class="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white bg-gray-800 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:bg-gray-700"
            >
              Download Binary
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

render(<WhyPage />, document.getElementById('app'));
