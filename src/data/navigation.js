export const siteConfig = {
  title: "Solobase - Modern Admin Dashboard",
  description: "Open source backend in a single binary",
  author: "Suppers Software Limited",
  logo: "/images/logo_long.png",
  demoUrl: "https://demo.solobase.dev",
  githubUrl: "https://github.com/suppers-ai/solobase",
  discordUrl: "https://discord.gg/jKqMcbrVzm",
};

export const mainMenu = [
  { name: "Home", url: "/" },
  { name: "Notes", url: "/notes/" },
  { name: "Why", url: "/why/" },
  { name: "Docs", url: "/docs/" },
  { name: "Demo", isDemo: true },
];

export const socialLinks = [
  { name: "Discord", url: "https://discord.gg/jKqMcbrVzm", icon: "discord" },
  {
    name: "GitHub",
    url: "https://github.com/suppers-ai/solobase",
    icon: "github",
  },
];

export const docsSidebar = [
  {
    title: "Documentation",
    items: [
      { name: "Overview", path: "/docs/" },
    ],
  },
];

export const footerResources = [
  { name: "Documentation", url: "/docs/" },
  { name: "Why Solobase", url: "/why/" },
  { name: "Notes", url: "/notes/" },
  { name: "GitHub", url: "https://github.com/suppers-ai/solobase" },
];
