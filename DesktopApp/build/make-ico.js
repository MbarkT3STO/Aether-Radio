#!/usr/bin/env node
/**
 * Pack a multi-resolution Windows .ico from PNG inputs.
 * Uses only Node stdlib. Icons are stored as PNG (valid in modern Windows).
 *
 * Sizes: 16, 24, 32, 48, 64, 128, 256 (recommended for Windows apps).
 */
const fs = require('fs')
const path = require('path')

const dir = __dirname
const sizes = [16, 24, 32, 48, 64, 128, 256]
const entries = sizes.map(s => ({
  size: s,
  data: fs.readFileSync(path.join(dir, `_ico${s}.png`)),
}))

// .ico header: 6 bytes + 16 bytes per entry
let offset = 6 + entries.length * 16
const header = Buffer.alloc(6 + entries.length * 16)
header.writeUInt16LE(0, 0)            // reserved
header.writeUInt16LE(1, 2)            // type = 1 (ICO)
header.writeUInt16LE(entries.length, 4) // number of images

entries.forEach((e, i) => {
  const off = 6 + i * 16
  const w = e.size === 256 ? 0 : e.size  // 0 means 256 in ICO
  const h = e.size === 256 ? 0 : e.size
  header.writeUInt8(w, off + 0)          // width
  header.writeUInt8(h, off + 1)          // height
  header.writeUInt8(0, off + 2)          // palette count
  header.writeUInt8(0, off + 3)          // reserved
  header.writeUInt16LE(1, off + 4)       // color planes
  header.writeUInt16LE(32, off + 6)      // bits per pixel
  header.writeUInt32LE(e.data.length, off + 8)   // size of image data
  header.writeUInt32LE(offset, off + 12)          // offset to image data
  offset += e.data.length
})

const out = Buffer.concat([header, ...entries.map(e => e.data)])
fs.writeFileSync(path.join(dir, 'icon.ico'), out)
console.log(`Wrote icon.ico (${out.length} bytes, ${entries.length} sizes)`)

// Clean up intermediate PNGs
sizes.forEach(s => {
  try { fs.unlinkSync(path.join(dir, `_ico${s}.png`)) } catch {}
})
