# ft-chat-web

Web client for ft-chat (Svelte 5 + Vite), talking to the same PocketBase
collections as the phone app (`ft_users`, `ft_messages` from `../ft-chat/pb_schema.json`).

## Setup

```sh
npm install
npm run dev        # http://localhost:5173
```

Settings live in `.env`:

| Variable | Default | |
|---|---|---|
| `VITE_PB_URL` | `https://pb.aryo.fyi` | PocketBase URL. Empty = same origin as the page. |
| `VITE_DEVICE_NAME` | `desktop` | Written into each message's `device` field; matching messages sit on the right. |

Other constants (page size, 95 MiB upload cap) are in `src/lib/config.ts`.

## Build & deploy

```sh
npm run build      # -> dist/ (static files, relative paths)
```

Host `dist/` anywhere. Two easy options:

- **Same server as PocketBase:** copy `dist/*` into PocketBase's `pb_public/`
  folder and set `VITE_PB_URL=` (empty) before building. PocketBase serves the
  app at your tunnel URL; no CORS involved.
- **Any static host:** PocketBase allows cross-origin requests by default.

Copy-to-clipboard needs HTTPS (or `localhost`).

## Features

- Username/password login (persisted in localStorage), logout
- Newest 40 messages, older pages load as you scroll up (cursor-based)
- Realtime create/update/delete; refetches when the tab becomes visible, the
  network comes back, or the realtime connection reconnects
- Text, files, or both; attach via button, paste, or drag & drop; upload
  progress with cancel; 95 MiB per message (Cloudflare tunnel limit)
- Enter sends, Shift+Enter = new line (touch screens: Enter = new line)
- Right-click / long-press a message: copy or delete (with confirmation)
- Images/videos open in a viewer that zooms out of the bubble (←/→, swipe, Esc);
  other files open a details card (type, MIME, size, device, date) with
  Copy link / Download

## Checks

```sh
npm run check      # svelte-check (types + a11y)
npm test           # randomized list-sync simulation (vitest)
```
