import { render } from 'preact';
import { useState } from 'preact/hooks';
import '../css/main.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import DemoModal from '../components/DemoModal';

function NotesPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = () => setDemoOpen(true);

  return (
    <>
      <Header onOpenDemo={openDemo} />
      <main>
        <section class="max-w-2xl mx-auto px-6 py-16 sm:py-20">
          <h1 class="text-4xl sm:text-5xl font-bold text-gray-800 mb-4 leading-tight">
            Important <span style={{ color: 'var(--primary)' }}>Notes</span>
          </h1>
          <p class="text-gray-500 text-lg mb-10">
            A quick, honest word before you run this in anger.
          </p>

          <div
            class="rounded-xl p-6 mb-8"
            style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
            }}
          >
            <p class="text-gray-800 leading-relaxed" style={{ fontSize: '1rem' }}>
              Solobase is an <strong>experimental backend in active development</strong>.
              Most of it was vibe-coded after work when I was half awake, so please run it with your fingers crossed
              — it will most likely break in surprising and entertaining ways.
            </p>
            <ul class="text-gray-800 leading-relaxed mt-4 space-y-2 list-disc pl-6" style={{ fontSize: '1rem' }}>
              <li>Be cautious.</li>
              <li>Use it for testing and experimental projects.</li>
              <li>Wait until I actually read the code before going anywhere near production.</li>
              <li>Your production project deserves better — for now.</li>
            </ul>
          </div>

          <h2 class="text-2xl font-bold text-gray-800 mb-3">I need your help</h2>
          <p class="text-gray-600 leading-relaxed mb-4">
            To keep this project alive — and to prove it's actually useful and
            not just AI slop — please:
          </p>
          <ul class="text-gray-700 leading-relaxed mb-6 space-y-2" style={{ fontSize: '1rem', listStyle: 'none', paddingLeft: 0 }}>
            <li>
              <span class="mr-2">⭐</span>
              <a
                href="https://github.com/suppers-ai/solobase"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)', textDecoration: 'underline' }}
              >
                Star the repo on GitHub
              </a>{' '}
              so I know someone out there cares.
            </li>
            <li>
              <span class="mr-2">🐛</span>
              <a
                href="https://github.com/suppers-ai/solobase/issues"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)', textDecoration: 'underline' }}
              >
                Open an issue
              </a>{' '}
              when you find a bug. Bonus points for screenshots and memes.
            </li>
            <li>
              <span class="mr-2">🚀</span>
              Suggest a feature — or even better,{' '}
              <a
                href="https://github.com/suppers-ai/solobase/pulls"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)', textDecoration: 'underline' }}
              >
                send a PR
              </a>
              .
            </li>
            <li>
              <span class="mr-2">💬</span>
              <a
                href="https://discord.gg/jKqMcbrVzm"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)', textDecoration: 'underline' }}
              >
                Hop into Discord
              </a>{' '}
              and tell me what's working, what's broken, or just say hi.
            </li>
            <li>
              <span class="mr-2">📢</span>
              Tell a friend. Or a colleague. Or a stranger on the internet.
            </li>
            <li>
              <span class="mr-2">👵</span>
              Invite your grandmother over for dinner, tell her about Solobase, and post it on social media.
            </li>
          </ul>

          <div class="flex gap-3 flex-wrap mb-10">
            <a
              href="https://github.com/suppers-ai/solobase"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-5 py-2.5 rounded-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: 'var(--primary)' }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'var(--primary)')}
            >
              Star on GitHub
            </a>
            <a
              href="https://discord.gg/jKqMcbrVzm"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-5 py-2.5 rounded-lg font-semibold text-white bg-gray-800 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-gray-700"
            >
              Join Discord
            </a>
          </div>

          <p class="text-gray-600 text-lg">
            Thanks for trying it out ❤️
          </p>
        </section>
      </main>
      <Footer onOpenDemo={openDemo} />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}

render(<NotesPage />, document.getElementById('app'));
