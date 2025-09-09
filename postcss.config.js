const purgecss = require('@fullhuman/postcss-purgecss');
const cssnano = require('cssnano');

module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
    ...(process.env.NODE_ENV === 'production'
      ? [
          purgecss({
            content: [
              './layouts/**/*.html',
              './themes/**/*.html',
              './content/**/*.md',
              './static/**/*.js',
            ],
            defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
            safelist: [
              'hljs',
              /^hljs-/,
              'dark',
              'light',
              /^bg-/,
              /^text-/,
            ],
          }),
          cssnano({
            preset: 'default',
          }),
        ]
      : []),
  ],
}