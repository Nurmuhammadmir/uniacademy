# Concept images

Drop image files here, named after the vocab word they represent (lowercase, hyphens for spaces),
e.g. `apple.png`, `house.png`, `traffic-light.jpg`.

When you add a Concept via the seed data (or director tooling later), set its `image` field to
`/static/images/concepts/<filename>` - the server serves this whole `public/` folder at `/static`
(see `server.js`), so that path resolves to the actual file on disk. No external CDN or upload
service needed for now; this is the simplest way to get real images working end to end.
