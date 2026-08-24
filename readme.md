# Salah AbuShamseih — Portfolio

An interactive 3D portfolio built with Three.js and cannon.js — drive a car around a world where the sections are places you visit.

## Setup
Download [Node.js](https://nodejs.org/en/download/).
Run the following commands:

``` bash
# Install dependencies
npm install

# Serve at localhost:5173
npm run dev

# Build for production in the dist/ directory
npm run build
```

## Editing content

Name, tagline, bio, email, social links, achievements and projects all live in
`src/javascript/Content.js`. Nothing else needs touching to update them.

A project with one destination uses `link` (plus optional `linkLabel`); one
published in more than one place uses `links: [{ href, label }]` instead and
gets a floor pad per entry. Two pads is what the floor fits. Adding `mark`
(`'appStore'` or `'playStore'`) stands that store's logo on the pad.

## License

MIT — see [license.md](license.md).
