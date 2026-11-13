const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');

function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' }, output: { type: 'string' },
      columns: { type: 'string', default: '160' },
      title: { type: 'string', default: 'Living ASCII' },
      crop: { type: 'string' }, color: { type: 'string', default: '#dfcbb0' },
      invert: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false }, help: { type: 'boolean', default: false }
    }
  });
  if (values.help) {
    console.log(`Create one offline fixed-grid ASCII animation. Requires Node.js 18.3+.
Usage: node create_ascii.cjs --input source.png --output artwork.html [options]
Inputs: PNG, JPEG, WebP, GIF (first decoded frame), BMP, or plain ASCII .txt
Options:
  --columns N       16..320 columns, default 160
  --crop x,y,w,h    Image crop in original pixels
  --color #RRGGBB   Plain-text tint, default #dfcbb0
  --invert         Interpret dense text characters as dark ink
  --title TEXT     Document title and accessible artwork label
  --force          Replace an existing output file
The generated scene(time) function can be adapted to the subject's movement.`);
    return;
  }
  if (!values.input || !values.output) throw new Error('--input and --output are required');
  const input = path.resolve(values.input);
  const output = path.resolve(values.output);
  if (input === output) throw new Error('Input and output must be different files');
  if (path.extname(output).toLowerCase() !== '.html') throw new Error('Output must use the .html extension');
  const columns = Number(values.columns);
  if (!Number.isInteger(columns) || columns < 16 || columns > 320) throw new Error('--columns must be an integer from 16 to 320');
  if (!/^#[a-f\d]{6}$/i.test(values.color)) throw new Error('--color must be #RRGGBB');
  const inputBytes = fs.readFileSync(input);
  const extension = path.extname(input).toLowerCase();
  let source;
  if (extension === '.txt') {
    const text = inputBytes.toString('utf8');
    if (!text.trim()) throw new Error('ASCII input is empty');
    if (/[^\x20-\x7e\r\n\t]/.test(text)) throw new Error('Text input must contain printable ASCII, tabs, and newlines');
    if (values.crop) throw new Error('--crop applies to image input');
    source = { kind: 'ascii', text, invert: values.invert, tint: values.color };
  } else {
    const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp' };
    const mime = mimeTypes[extension];
    if (!mime) throw new Error('Unsupported source extension. Use --help for supported formats');
    if (values.invert) throw new Error('--invert applies to ASCII text input');
    source = { kind: 'image', url: 'data:' + mime + ';base64,' + inputBytes.toString('base64') };
    if (values.crop) {
      const crop = values.crop.split(',').map(Number);
      if (crop.length !== 4 || crop.some(value => !Number.isInteger(value)) || crop[0] < 0 || crop[1] < 0 || crop[2] <= 0 || crop[3] <= 0) {
        throw new Error('--crop requires nonnegative x,y and positive width,height in pixels');
      }
      source.crop = crop;
    }
  }
  const config = JSON.stringify({ source, columns, title: values.title }).replace(/</g, '\\u003c');
  const title = values.title.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'assets', 'ascii-runtime.js'), 'utf8');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100svh; padding: 24px; display: grid; place-items: center; background: #070808; color: #dfcbb0; font-family: system-ui, sans-serif; }
  main { width: min(1200px, 100%); }
  canvas { display: block; width: 100%; max-height: calc(100svh - 48px); object-fit: contain; }
</style></head><body><main id="ascii-motion">
  <canvas role="img" aria-label="${title}">${title}</canvas>
  <p role="alert" hidden></p>
</main><script id="ascii-motion-config" type="application/json">${config}</script><script>${runtime}</script></body></html>`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html, { flag: values.force ? 'w' : 'wx' });
  console.log(output);
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
