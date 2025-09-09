# Solobase Demo Site

This is the Hugo-based static website for the Solobase project demo and documentation.

## Structure

```
solobase-demo-site/
├── config.yaml              # Site configuration
├── content/                  # Content files
│   ├── _index.md            # Homepage content
│   ├── docs/                # Documentation section
│   └── demo/                # Demo section
├── themes/solobase-theme/   # Custom theme
│   ├── layouts/             # HTML templates
│   ├── assets/              # CSS/JS source files
│   └── static/              # Theme static files
├── static/                  # Site static files
└── public/                  # Generated site (build output)
```

## Development

### Prerequisites

- Hugo Extended v0.112.0 or later

### Local Development

1. Start the development server:
   ```bash
   hugo server --source solobase-demo-site --buildDrafts --buildFuture
   ```

2. Open your browser to `http://localhost:1313`

### Building for Production

1. Build the static site:
   ```bash
   hugo --source solobase-demo-site --destination public --minify
   ```

2. The generated site will be in the `public/` directory

## Theme Features

- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Modern Layout**: Clean, professional appearance
- **Demo Integration**: Interactive demo environment
- **Documentation**: Comprehensive docs with search
- **Performance**: Optimized for fast loading
- **SEO**: Proper meta tags and structured data

## Configuration

Key configuration options in `config.yaml`:

- `baseURL`: Your site's base URL
- `params.demo_url`: URL for the live demo environment
- `params.github_url`: GitHub repository URL
- `menu.main`: Navigation menu items

## Content Management

### Adding Documentation

1. Create new markdown files in `content/docs/`
2. Use front matter to set title, description, and other metadata
3. Content will automatically appear in the documentation section

### Updating Homepage

Edit `content/_index.md` to modify homepage content.

### Demo Configuration

The demo section is configured in `content/demo/_index.md` and uses the special `demo` layout for interactive features.

## Deployment

This site can be deployed to any static hosting platform:

- **Netlify**: Connect your Git repository for automatic deployments
- **Vercel**: Import the project and set build command to `hugo --minify`
- **GitHub Pages**: Use GitHub Actions with Hugo
- **AWS S3**: Upload the `public/` directory contents
- **CDN**: Any CDN that supports static file hosting

## Customization

### Styling

- Modify `themes/solobase-theme/assets/css/main.css` for custom styles
- The theme uses Tailwind CSS classes throughout the templates

### Layout

- Edit templates in `themes/solobase-theme/layouts/`
- Partials are in `themes/solobase-theme/layouts/partials/`

### JavaScript

- Add custom JavaScript to `themes/solobase-theme/assets/js/main.js`
- The build process will automatically minify and include it

## License

This theme and site configuration is part of the Solobase project.