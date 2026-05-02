import { siteConfig } from '../data/navigation';

// Slot-driven port of <sa-footer>. The kit owns the dark-band chrome
// (background, hairline, padding); we own the contents — three
// categorized link columns and a logo whitened via CSS filter.
//
// Categories live here (not in data/navigation.js) because they are
// footer-specific groupings, not shared with the header nav. If they
// grow or get reused elsewhere, lift them out then.
const productLinks = [
  { name: 'Home', url: '/' },
  { name: 'Why', url: '/why/' },
  { name: 'Notes', url: '/notes/' },
  { name: 'Demo', url: siteConfig.demoUrl, external: true },
];

const docsLinks = [
  { name: 'Docs', url: '/docs/' },
  { name: 'Installation', url: '/docs/installation/' },
  { name: 'Configuration', url: '/docs/configuration/' },
  { name: 'API Reference', url: '/docs/api/auth/' },
  { name: 'Deployment', url: '/docs/deployment/docker/' },
];

const communityLinks = [
  { name: 'GitHub', url: siteConfig.githubUrl, external: true },
  { name: 'Discord', url: siteConfig.discordUrl, external: true },
];

function Column({ title, links }) {
  return (
    <nav class="solobase-footer-column" aria-label={title}>
      <h4>{title}</h4>
      {links.map((link) => (
        <a
          key={link.name}
          href={link.url}
          {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {link.name}
        </a>
      ))}
    </nav>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <sa-footer>
      <div slot="brand">
        <img
          src="/images/logo_long.png"
          alt={siteConfig.title}
          class="solobase-footer-logo"
          style={{ height: '40px', width: 'auto' }}
        />
        <p style={{ marginTop: 'var(--sa-space-3)', color: 'var(--sa-footer-text-muted)', fontSize: 'var(--sa-text-sm)', maxWidth: '24rem' }}>
          {siteConfig.description}
        </p>
      </div>
      <div slot="links" class="solobase-footer-grid">
        <Column title="Product" links={productLinks} />
        <Column title="Documentation" links={docsLinks} />
        <Column title="Community" links={communityLinks} />
      </div>
      <span slot="copyright">
        © {year} {siteConfig.author}. Solobase™ is a trademark of Suppers Software Limited, New Zealand.
      </span>
    </sa-footer>
  );
}
