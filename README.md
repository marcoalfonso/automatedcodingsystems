# automatedcodingsystems

Landing page for [automatedcodingsystems.com](https://automatedcodingsystems.com), the
Automated Coding Systems consultancy (AI implementation and AI cyber security).

React 19 + TypeScript + Vite. Single page, no router, no CSS framework.

## Develop

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build locally
```

## Where things live

| Path | What |
| --- | --- |
| `src/content.ts` | All copy: services, capabilities, showcases, clients, contact email |
| `src/components/` | One component per page section |
| `src/components/RippleLogo.tsx` | Pixelated ACS footer logo with the water ripple (canvas) |
| `src/index.css` | Design tokens and all styles |
| `deploy/nginx.conf` | Example nginx site config for the VPS |

## Contact form

The form has no backend yet. By default it opens the visitor's mail client with the
message prefilled, addressed to `CONTACT_EMAIL` in `src/content.ts`.

To send submissions to an API instead, set `VITE_CONTACT_ENDPOINT` at build time
(see `.env.example`). The form then POSTs JSON: `{ name, email, company, interest, message }`.

## Client logos

Clients are rendered as text wordmarks from the `clients` array in `src/content.ts`.
To use official logos, add SVGs under `src/assets/clients/` and swap the text in
`src/components/Clients.tsx` for `<img>` tags. Check each company's brand guidelines first.

## Deploy (Hetzner VPS behind Cloudflare)

The site is static: build it and serve `dist/`.

1. `npm ci && npm run build`
2. Copy `dist/` to the server, for example
   `rsync -az --delete dist/ user@server:/var/www/automatedcodingsystems/dist/`
3. Install `deploy/nginx.conf` as the nginx site and reload nginx.
4. In Cloudflare, point proxied `A`/`AAAA` records for `@` and `www` at the VPS,
   install a Cloudflare Origin Certificate on the server and set SSL mode to Full (strict).
