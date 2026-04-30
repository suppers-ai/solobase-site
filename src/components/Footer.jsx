import { siteConfig, mainMenu, footerResources } from '../data/navigation';

// Slot-driven port of <sa-footer>. Slots: brand (logo + tagline), links
// (a single nav with all our footer links), copyright (© line + trademark).
// Kit owns the dark-band background, padding, and grid; we own the contents.
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <sa-footer>
      <div slot="brand">
        <img
          src="/images/logo_long.png"
          alt={siteConfig.title}
          style={{ height: '40px', width: 'auto' }}
        />
        <p style={{ marginTop: 'var(--sa-space-3)', color: 'var(--sa-text-muted)', fontSize: 'var(--sa-text-sm)', maxWidth: '24rem' }}>
          {siteConfig.description}
        </p>
      </div>
      <nav slot="links">
        {mainMenu.map((item) => (
          <a
            key={item.name}
            href={item.isDemo ? siteConfig.demoUrl : item.url}
            {...(item.external || item.isDemo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {item.name}
          </a>
        ))}
        {footerResources.map((item) => (
          <a key={item.name} href={item.url}>
            {item.name}
          </a>
        ))}
        <a href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href={siteConfig.discordUrl} target="_blank" rel="noopener noreferrer">Discord</a>
      </nav>
      <span slot="copyright">
        © {year} {siteConfig.author}. Solobase™ is a trademark of Suppers Software Limited, New Zealand.
      </span>
    </sa-footer>
  );
}
