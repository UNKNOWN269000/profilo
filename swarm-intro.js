/* Original, lightweight swarm-inspired page reveal. No extension code is used. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const boot = document.querySelector('#boot-screen');
  if (!boot) return;
  let started = false;
  function start() {
    if (started) return;
    started = true;
    const canvas = document.createElement('canvas');
    canvas.className = 'swarm-intro';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); return; }

    const colors = ['#00f3ff', '#ff0055', '#55ffb8', '#ae82ff', '#ffd166', '#77aaff'];
    const names = ['Ada', 'Linus', 'Grace', 'Alan', 'Hedy', 'Radia'];
    const width = innerWidth, height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    const size = Math.max(72, Math.min(115, width / 8));
    const cols = Math.ceil(width / size), rows = Math.ceil(height / size);
    const tiles = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * size, y = row * size;
        // Reveal the headline first, then radiate out across the viewport.
        const distance = Math.hypot((x - width * .35) / width, (y - height * .45) / height);
        tiles.push({ x, y, w: Math.min(size + 1, width - x), h: Math.min(size + 1, height - y),
          at: 450 + distance * 1600 + Math.random() * 480 });
      }
    }
    tiles.sort((a, b) => a.at - b.at);
    const duration = Math.max(...tiles.map(tile => tile.at)) + 550;
    const startTime = performance.now();
    let frameId;

    function draw(now) {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#03040a';
      ctx.fillRect(0, 0, width, height);
      // Cutting holes in the overlay reveals the actual interactive site below.
      ctx.globalCompositeOperation = 'destination-out';
      for (const tile of tiles) {
        if (elapsed >= tile.at) ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
      }
      ctx.globalCompositeOperation = 'source-over';

      for (let i = 0; i < names.length; i++) {
        const active = tiles.filter((tile, index) => index % names.length === i && Math.abs(elapsed - tile.at) < 240);
        if (!active.length) continue;
        const tile = active[active.length - 1];
        const progress = Math.max(0, Math.min(1, (elapsed - tile.at + 180) / 360));
        const x = tile.x + tile.w * progress, y = tile.y + tile.h * .55;
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 1.5;
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 12;
        ctx.strokeRect(tile.x + 4, tile.y + 4, (tile.w - 8) * progress, tile.h - 8);
        ctx.beginPath();
        ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y);
        ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = colors[i];
        ctx.font = '10px monospace';
        ctx.fillText(names[i], Math.min(x + 9, width - 45), Math.max(12, y - 10));
      }
      if (elapsed < duration) frameId = requestAnimationFrame(draw);
      else {
        canvas.classList.add('swarm-intro--done');
        setTimeout(() => canvas.remove(), 450);
      }
    }
    frameId = requestAnimationFrame(draw);
    // Never strand the visitor behind an overlay on navigation or interruption.
    const dismiss = () => { cancelAnimationFrame(frameId); canvas.remove(); };
    window.addEventListener('pagehide', dismiss, { once: true });
    window.addEventListener('keydown', event => { if (event.key === 'Escape') dismiss(); }, { once: true });
  }

  if (boot.classList.contains('is-complete')) start();
  else {
    const observer = new MutationObserver(() => {
      if (boot.classList.contains('is-complete')) { observer.disconnect(); setTimeout(start, 500); }
    });
    observer.observe(boot, { attributes: true, attributeFilter: ['class'] });
  }
})();
