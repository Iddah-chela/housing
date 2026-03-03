const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const iconsDir  = path.join(__dirname, 'public', 'icons');
const publicDir = path.join(__dirname, 'public');

// Read sources into memory BEFORE any writes (avoids same-file conflict)
const APP_BUF     = fs.readFileSync(path.join(iconsDir, 'icon-512.png'));
const FAVICON_BUF = fs.readFileSync(path.join(iconsDir, 'favicon-512.png'));

async function gen(buf, dest, size, padPct = 0) {
  const inner = Math.round(size * (1 - padPct * 2));
  const pad   = Math.floor((size - inner) / 2);

  let pipeline = sharp(buf).trim({ threshold: 15 });

  if (pad > 0) {
    pipeline = pipeline
      .resize(inner, inner, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
      .extend({ top: pad, bottom: size-inner-pad, left: pad, right: size-inner-pad,
                background: { r:0,g:0,b:0,alpha:0 } });
  } else {
    pipeline = pipeline.resize(size, size, { fit: 'cover' });
  }

  await pipeline.resize(size, size).png().toFile(dest);
  console.log(`✓ ${path.basename(dest)} ${size}x${size}`);
}

(async () => {
  await gen(APP_BUF, path.join(iconsDir,  'icon-512.png'),        512, 0.05);
  await gen(APP_BUF, path.join(iconsDir,  'icon-192.png'),        192, 0.05);
  await gen(APP_BUF, path.join(iconsDir,  'apple-touch-icon.png'),180, 0.05);

  await gen(FAVICON_BUF, path.join(iconsDir,  'favicon-512.png'), 512, 0);
  await gen(FAVICON_BUF, path.join(iconsDir,  'favicon-256.png'), 256, 0);
  await gen(FAVICON_BUF, path.join(iconsDir,  'favicon-32.png'),   32, 0);
  await gen(FAVICON_BUF, path.join(publicDir, 'favicon.png'),      64, 0);

  console.log('\nDone.');
})().catch(e => { console.error(e.message); process.exit(1); });
