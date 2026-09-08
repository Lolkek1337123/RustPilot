import fs from 'fs';
import path from 'path';

// Generate a 128x128 uncompressed PNG with pure random grayscale noise
function generateNoisePNG() {
  const width = 128;
  const height = 128;
  
  // Minimal PNG generator
  const pako = null; // We can write raw uncompressed IDAT or use canvas/base64
}

// Or SVG-based procedural noise filter tile
const svgNoise = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <filter id="noiseFilter">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
</svg>`;

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, 'noise.svg'), svgNoise);

// Also generate a raw PNG noise using Node buffers
// PNG Signature: 89 50 4E 47 0D 0A 1A 0A
// Let's create an actual PNG with zlib
import zlib from 'zlib';

function createNoisePngBuffer(w, h) {
  const bytesPerPixel = 4; // RGBA
  const rawData = Buffer.alloc(h * (1 + w * bytesPerPixel));
  let offset = 0;
  
  for (let y = 0; y < h; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < w; x++) {
      const v = Math.floor(Math.random() * 256);
      const a = Math.floor(Math.random() * 50) + 15; // Alpha
      rawData[offset++] = v;
      rawData[offset++] = v;
      rawData[offset++] = v;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Chunks: IHDR, IDAT, IEND
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Table-based CRC32
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ 0xffffffff;
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = chunk('IHDR', ihdrData);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const noisePng = createNoisePngBuffer(128, 128);
fs.writeFileSync(path.join(publicDir, 'noisy.png'), noisePng);
console.log('✓ Created crisp noisy.png texture in public/noisy.png (size:', noisePng.length, 'bytes)');
