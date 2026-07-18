# SAA Podcast

The **Sudan Art Archive podcast** — a bilingual (English / Arabic) episode site with an audio
player and an RSS feed for Apple Podcasts and other directories.

🔗 [podcast.sudanartarchive.com](https://podcast.sudanartarchive.com)

```
saa-podcast/
├── frontend/    Astro (SSR) → Cloudflare Workers
└── studio/      Sanity Studio — schema and admin UI
```

Content lives in Sanity; episode audio lives in a Cloudflare R2 bucket. Every route is
server-rendered, so publishing in Studio goes live without a redeploy.

## Getting started

```sh
cd frontend && npm install && npm run dev     # http://localhost:4321
cd studio   && npm install && npm run dev     # http://localhost:3333
```

No environment variables or `.env` file are needed.

## Deploying

The two packages deploy independently.

```sh
cd frontend && npm run deploy   # builds, then wrangler deploy
cd studio   && npm run deploy   # sanity deploy
```

## Contributing

**Read [AGENTS.md](AGENTS.md) before making changes.** It covers the Sanity request budget and
caching rules, the two-wrangler-config trap that will otherwise break every static asset, the
bilingual system, and the styling conventions shared with the sister project
[SAA Forms](https://forms.sudanartarchive.com).
