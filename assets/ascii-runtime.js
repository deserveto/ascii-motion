(async () => {
  'use strict';
  // Reference engines studied for the fixed grid, bilinear sampling, brightness
  // buckets, precomputed glyph masks, and downsampled character-glow pipeline.
  // https://github.com/arimecoa/GIVEAWAY-ASCII/blob/main/knight.html
  // https://github.com/arimecoa/GIVEAWAY-ASCII/blob/main/lily_bouquet.html
  const config = JSON.parse(document.getElementById('ascii-motion-config').textContent);
  const root = document.getElementById('ascii-motion');
  const view = root.querySelector('canvas');
  const context = view.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas 2D is unavailable');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const decoded = await decodeSource(config.source);
  const columns = config.columns;
  const cellWidth = 7;
  const cellHeight = 12;
  const rows = Math.max(8, Math.min(240, Math.round(columns * cellWidth / cellHeight / decoded.aspect)));
  const width = columns * cellWidth;
  const height = rows * cellHeight;
  const sourceWidth = columns * 2;
  const sourceHeight = rows * 2;
  const field = document.createElement('canvas');
  field.width = sourceWidth;
  field.height = sourceHeight;
  const fieldContext = field.getContext('2d');
  const frameAspect = width / height;
  const fittedWidth = decoded.aspect > frameAspect ? sourceWidth : sourceHeight * cellHeight / cellWidth * decoded.aspect;
  const fittedHeight = decoded.aspect > frameAspect ? sourceWidth * cellWidth / cellHeight / decoded.aspect : sourceHeight;
  fieldContext.drawImage(decoded.image, ...decoded.crop,
    (sourceWidth - fittedWidth) / 2, (sourceHeight - fittedHeight) / 2, fittedWidth, fittedHeight);
  const rgba = fieldContext.getImageData(0, 0, sourceWidth, sourceHeight).data;
  const source = new Uint8Array(sourceWidth * sourceHeight * 3);
  for (let pixel = 0; pixel < sourceWidth * sourceHeight; pixel++) {
    const alpha = rgba[pixel * 4 + 3] / 255;
    for (let channel = 0; channel < 3; channel++) source[pixel * 3 + channel] = Math.round(rgba[pixel * 4 + channel] * alpha);
  }
  const luminance = new Float32Array(columns * rows);
  const rgb = new Float32Array(columns * rows * 3);
  const buckets = [' ', '.', ':;', '-=', '+*', '%#', '@&'];
  const levels = [0.055, 0.16, 0.29, 0.44, 0.61, 0.79];
  const characters = buckets.join('');
  const starts = [];
  let characterCount = 0;
  for (const bucket of buckets) {
    starts.push(characterCount);
    characterCount += bucket.length;
  }

  const ratio = Math.min(2, Math.max(1, Math.ceil(devicePixelRatio || 1)));
  const glyphWidth = cellWidth * ratio;
  const glyphHeight = cellHeight * ratio;
  const masks = [...characters].map(character => {
    const tile = document.createElement('canvas');
    tile.width = glyphWidth;
    tile.height = glyphHeight;
    const tileContext = tile.getContext('2d');
    tileContext.font = (12 * ratio) + 'px Consolas, "Courier New", monospace';
    tileContext.textBaseline = 'middle';
    tileContext.fillStyle = '#fff';
    tileContext.fillText(character, 0, glyphHeight / 2);
    const pixels = tileContext.getImageData(0, 0, glyphWidth, glyphHeight).data;
    const mask = new Uint8Array(glyphWidth * glyphHeight);
    for (let pixel = 0; pixel < mask.length; pixel++) mask[pixel] = pixels[pixel * 4 + 3];
    return mask;
  });
  const cellSeeds = new Uint32Array(columns * rows);
  for (let index = 0; index < cellSeeds.length; index++) {
    let seed = Math.imul(index + 1, 73856093) ^ Math.imul(index % columns, 19349663);
    seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
    cellSeeds[index] = (seed ^ (seed >>> 16)) >>> 0;
  }
  const ascii = document.createElement('canvas');
  ascii.width = width * ratio;
  ascii.height = height * ratio;
  const asciiContext = ascii.getContext('2d');
  const image = asciiContext.createImageData(ascii.width, ascii.height);
  const pixels = new Uint32Array(image.data.buffer);
  const glowLayers = [2, 4, 8].map(divisor => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(ascii.width / divisor);
    canvas.height = Math.ceil(ascii.height / divisor);
    return { canvas, context: canvas.getContext('2d') };
  });
  let elapsed = 0;
  let previousTime = null;
  let paintElapsed = 0;
  let frame = null;


  async function decodeSource(input) {
    if (input.kind === 'image') {
      const image = new Image();
      image.src = input.url;
      await image.decode();
      const crop = input.crop || [0, 0, image.naturalWidth, image.naturalHeight];
      if (crop[0] + crop[2] > image.naturalWidth || crop[1] + crop[3] > image.naturalHeight) {
        throw new Error('Crop extends beyond the source image');
      }
      return { image, crop, aspect: crop[2] / crop[3] };
    }
    const lines = input.text.replace(/\r/g, '').replace(/\t/g, '    ').split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    const textColumns = Math.max(...lines.map(line => line.length));
    const image = document.createElement('canvas');
    image.width = textColumns;
    image.height = lines.length;
    const target = image.getContext('2d');
    const data = target.createImageData(image.width, image.height);
    const probe = document.createElement('canvas');
    probe.width = 14;
    probe.height = 24;
    const probeContext = probe.getContext('2d');
    probeContext.font = '24px Consolas, "Courier New", monospace';
    probeContext.textBaseline = 'middle';
    probeContext.fillStyle = '#fff';
    function coverage(character) {
      probeContext.clearRect(0, 0, 14, 24);
      probeContext.fillText(character, 0, 12);
      const pixels = probeContext.getImageData(0, 0, 14, 24).data;
      let ink = 0;
      for (let pixel = 3; pixel < pixels.length; pixel += 4) ink += pixels[pixel];
      return ink;
    }
    const maximum = coverage('@');
    const densities = new Map();
    const tint = input.tint.match(/[a-f\d]{2}/gi).map(channel => parseInt(channel, 16));
    for (let row = 0; row < lines.length; row++) {
      for (let column = 0; column < lines[row].length; column++) {
        const character = lines[row][column];
        if (character === ' ') continue;
        if (!densities.has(character)) densities.set(character, Math.min(1, coverage(character) / maximum));
        const density = densities.get(character);
        const brightness = 0.12 + 0.82 * (input.invert ? 1 - density : density);
        const offset = (row * image.width + column) * 4;
        for (let channel = 0; channel < 3; channel++) data.data[offset + channel] = Math.round(tint[channel] * brightness);
        data.data[offset + 3] = 255;
      }
    }
    target.putImageData(data, 0, 0);
    return { image, crop: [0, 0, image.width, image.height], aspect: image.width * 7 / (image.height * 12) };
  }

  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  function ease(value) {
    const t = clamp(value);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // Replace this motion field to match the subject. The renderer below stays shared.
  function scene(time) {
    luminance.fill(0);
    const phase = Math.PI * 2 * time / 8;
    for (let row = 0; row < rows; row++) {
      const attachment = ease(1 - row / Math.max(1, rows - 1));
      const sway = 1.2 * attachment * attachment * Math.sin(phase);
      const lift = 0.65 * attachment * (1 - Math.cos(phase));
      const sourceY = (row + lift + 0.5) * 2 - 0.5;
      if (sourceY < 0 || sourceY >= sourceHeight - 1) continue;
      const y0 = Math.floor(sourceY);
      const fy = sourceY - y0;
      for (let column = 0; column < columns; column++) {
        const sourceX = (column - sway + 0.5) * 2 - 0.5;
        if (sourceX < 0 || sourceX >= sourceWidth - 1) continue;
        const x0 = Math.floor(sourceX);
        const fx = sourceX - x0;
        const top = (y0 * sourceWidth + x0) * 3;
        const bottom = top + sourceWidth * 3;
        const index = row * columns + column;
        const output = index * 3;
        const light = 1 + 0.04 * attachment * Math.sin(phase);
        for (let channel = 0; channel < 3; channel++) {
          const a = source[top + channel] * (1 - fx) + source[top + 3 + channel] * fx;
          const b = source[bottom + channel] * (1 - fx) + source[bottom + 3 + channel] * fx;
          rgb[output + channel] = (a * (1 - fy) + b * fy) / 255 * light;
        }
        luminance[index] = rgb[output] * 0.2126 + rgb[output + 1] * 0.7152 + rgb[output + 2] * 0.0722;
      }
    }
  }

  function draw(time) {
    scene(time);
    pixels.fill(0);
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const index = row * columns + column;
        const brightness = luminance[index];
        let level = 0;
        while (level < levels.length && brightness >= levels[level]) level++;
        if (level === 0) continue;
        const mask = masks[starts[level] + cellSeeds[index] % buckets[level].length];
        const colorIndex = index * 3;
        const shade = 0.74 + 0.3 * brightness;
        const red = Math.min(255, Math.round(rgb[colorIndex] * shade * 255));
        const green = Math.min(255, Math.round(rgb[colorIndex + 1] * shade * 255));
        const blue = Math.min(255, Math.round(rgb[colorIndex + 2] * shade * 255));
        const color = (blue << 16) | (green << 8) | red;
        let destination = row * glyphHeight * ascii.width + column * glyphWidth;
        let maskIndex = 0;
        for (let y = 0; y < glyphHeight; y++, destination += ascii.width) {
          for (let x = 0; x < glyphWidth; x++, maskIndex++) {
            const alpha = mask[maskIndex];
            if (alpha) pixels[destination + x] = (alpha << 24) | color;
          }
        }
      }
    }
    asciiContext.putImageData(image, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.fillStyle = '#070808';
    context.fillRect(0, 0, view.width, view.height);
    context.drawImage(ascii, 0, 0, view.width, view.height);
    let glowSource = ascii;
    for (const layer of glowLayers) {
      layer.context.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      layer.context.drawImage(glowSource, 0, 0, layer.canvas.width, layer.canvas.height);
      glowSource = layer.canvas;
    }
    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = 0.22 + 0.035 * Math.sin(time * Math.PI / 5);
    context.drawImage(glowSource, 0, 0, view.width, view.height);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
  }

  function tick(now) {
    if (!root.isConnected) return;
    if (previousTime !== null) {
      const delta = Math.min(now - previousTime, 64);
      elapsed += delta / 1000;
      paintElapsed += delta;
    }
    previousTime = now;
    if (paintElapsed >= 1000 / 60) {
      paintElapsed %= 1000 / 60;
      draw(elapsed);
    }
    frame = requestAnimationFrame(tick);
  }

  function setPaused(value) {
    cancelAnimationFrame(frame);
    previousTime = null;
    paintElapsed = 0;
    root.dataset.paused = String(value);
    if (!value) frame = requestAnimationFrame(tick);
  }

  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      elapsed = 0;
      draw(elapsed);
    }
    setPaused(event.matches);
  });
  new ResizeObserver(() => {
    view.width = Math.max(1, Math.round(root.clientWidth * ratio));
    view.height = Math.max(1, Math.round(view.width * height / width));
    draw(elapsed);
  }).observe(root);
  view.width = width * ratio;
  view.height = height * ratio;
  draw(elapsed);
  setPaused(reducedMotion.matches);
})().catch(error => {
  const root = document.getElementById('ascii-motion');
  const status = root.querySelector('[role="alert"]');
  status.textContent = 'Unable to render the source. ' + error.message;
  status.hidden = false;
});
