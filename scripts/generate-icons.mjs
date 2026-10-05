// Lager PNG-ikoner til PWA-manifestet fra public/favicon.svg.
// Kjør med `npm run icons` etter å ha endret ikonet.
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const green = '#2d5a47'

// Maskerbart ikon og iOS-ikon: full bakgrunn, motivet krympet inn i trygg sone.
const motif = svg.replace(/<rect width="512" height="512" rx="112"[^>]*\/>/, '').replace(/<\/?svg[^>]*>/g, '')
const fullBleed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${green}"/>
  <g transform="translate(256 256) scale(0.85) translate(-256 -256)">${motif}</g>
</svg>`

const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname

await sharp(Buffer.from(svg), { density: 384 }).resize(192, 192).png().toFile(out('icons/icon-192.png'))
await sharp(Buffer.from(svg), { density: 384 }).resize(512, 512).png().toFile(out('icons/icon-512.png'))
await sharp(Buffer.from(fullBleed), { density: 384 }).resize(512, 512).png().toFile(out('icons/icon-maskable-512.png'))
await sharp(Buffer.from(fullBleed), { density: 384 }).resize(180, 180).flatten({ background: green }).png().toFile(out('apple-touch-icon.png'))
console.log('Ikoner laget.')
