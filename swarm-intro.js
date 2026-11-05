/* Organic flocking swarm intro — a short, non-blocking canvas animation. */
(() => {
  const boot = document.querySelector('#boot-screen');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!boot || reducedMotion.matches) return;

  const TOTAL_TIME = 3.9;
  const RELEASE_START = 2.75;
  const TRAIL_INTERVAL = 0.035;
  const TRAIL_LENGTH = 7;
  const COLORS = {
    cyan: '0, 243, 255',
    ice: '159, 239, 255',
    pink: '255, 0, 85'
  };

  let started = false;
  let stopped = false;
  let canvas;
  let context;
  let agents = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let startTime = 0;
  let previousTime = 0;
  let frameId = 0;
  let observer;
  let removeMotionListener = () => {};

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const smoothstep = (start, end, value) => {
    const t = clamp((value - start) / (end - start), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function getFocus(time) {
    const mobile = width <= 820;
    const baseX = width * (mobile ? 0.53 : 0.71);
    const baseY = height * (mobile ? 0.34 : 0.48);
    return {
      x: baseX + Math.sin(time * 0.52) * width * 0.012,
      y: baseY + Math.cos(time * 0.43) * height * 0.014
    };
  }

  function makeAgent(focus) {
    const side = Math.floor(Math.random() * 4);
    const margin = 24;
    let x;
    let y;

    if (side === 0) { x = -margin; y = randomBetween(0, height); }
    else if (side === 1) { x = width + margin; y = randomBetween(0, height); }
    else if (side === 2) { x = randomBetween(0, width); y = -margin; }
    else { x = randomBetween(0, width); y = height + margin; }

    const toFocusX = focus.x - x;
    const toFocusY = focus.y - y;
    const distance = Math.max(1, Math.hypot(toFocusX, toFocusY));
    const speed = randomBetween(125, 215);
    const colorRoll = Math.random();
    const color = colorRoll > 0.83 ? COLORS.pink : colorRoll > 0.69 ? COLORS.ice : COLORS.cyan;
    const minDimension = Math.min(width, height);
    const phase = Math.random() * Math.PI * 2;

    return {
      x,
      y,
      vx: (toFocusX / distance) * speed + randomBetween(-22, 22),
      vy: (toFocusY / distance) * speed + randomBetween(-22, 22),
      orbitRadius: minDimension * randomBetween(width <= 820 ? 0.14 : 0.15, width <= 820 ? 0.23 : 0.245),
      orbitSpeed: randomBetween(48, 86),
      turn: Math.random() < 0.14 ? -randomBetween(0.45, 0.8) : randomBetween(0.82, 1.08),
      size: randomBetween(0.75, 1.45),
      color,
      phase,
      bornAt: randomBetween(0.05, 0.62),
      trail: [],
      trailClock: randomBetween(0, TRAIL_INTERVAL)
    };
  }

  function resizeCanvas() {
    const oldWidth = width;
    const oldHeight = height;
    const oldMinDimension = Math.min(oldWidth, oldHeight);

    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    if (!oldWidth || !oldHeight) return;
    const scaleX = width / oldWidth;
    const scaleY = height / oldHeight;
    const newMinDimension = Math.min(width, height);
    const radiusScale = oldMinDimension ? newMinDimension / oldMinDimension : 1;

    agents.forEach((agent) => {
      agent.x *= scaleX;
      agent.y *= scaleY;
      agent.orbitRadius *= radiusScale;
      agent.trail.forEach((point) => {
        point.x *= scaleX;
        point.y *= scaleY;
      });
    });
  }

  function drawAmbientGlow(focus, time) {
    const entering = smoothstep(0, 0.55, time);
    const leaving = 1 - smoothstep(RELEASE_START, TOTAL_TIME, time);
    const radius = Math.max(width, height) * 0.48;
    const glow = context.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, radius);
    glow.addColorStop(0, 'rgba(0, 243, 255, 0.12)');
    glow.addColorStop(0.38, 'rgba(0, 120, 150, 0.055)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.globalAlpha = entering * leaving * 0.48;
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }

  function updateAgents(delta, time, focus) {
    const separationDistance = Math.max(18, Math.min(32, Math.min(width, height) * 0.038));
    const neighborhoodDistance = Math.max(58, Math.min(112, Math.min(width, height) * 0.13));
    const separationLimit = separationDistance * separationDistance;
    const neighborhoodLimit = neighborhoodDistance * neighborhoodDistance;
    const release = smoothstep(RELEASE_START, TOTAL_TIME, time);

    for (let i = 0; i < agents.length; i += 1) {
      const agent = agents[i];
      let separateX = 0;
      let separateY = 0;
      let alignedX = 0;
      let alignedY = 0;
      let centerX = 0;
      let centerY = 0;
      let neighborCount = 0;

      for (let j = 0; j < agents.length; j += 1) {
        if (i === j) continue;
        const other = agents[j];
        const dx = agent.x - other.x;
        const dy = agent.y - other.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared <= 0.01 || distanceSquared > neighborhoodLimit) continue;

        const distance = Math.sqrt(distanceSquared);
        if (distanceSquared < separationLimit) {
          separateX += dx / distanceSquared;
          separateY += dy / distanceSquared;
        }
        alignedX += other.vx;
        alignedY += other.vy;
        centerX += other.x;
        centerY += other.y;
        neighborCount += 1;
      }

      const offsetX = agent.x - focus.x;
      const offsetY = agent.y - focus.y;
      const radius = Math.max(1, Math.hypot(offsetX, offsetY));
      const radialX = offsetX / radius;
      const radialY = offsetY / radius;
      const tangentX = -radialY * agent.turn;
      const tangentY = radialX * agent.turn;
      const radialSpeed = clamp((radius - agent.orbitRadius) * 1.05, -125, 285);

      let targetVelocityX = tangentX * agent.orbitSpeed - radialX * radialSpeed;
      let targetVelocityY = tangentY * agent.orbitSpeed - radialY * radialSpeed;
      targetVelocityX += radialX * 245 * release;
      targetVelocityY += radialY * 245 * release;

      let forceX = (targetVelocityX - agent.vx) * 1.55;
      let forceY = (targetVelocityY - agent.vy) * 1.55;

      if (neighborCount > 0) {
        forceX += separateX * 680;
        forceY += separateY * 680;
        forceX += (alignedX / neighborCount - agent.vx) * 0.34;
        forceY += (alignedY / neighborCount - agent.vy) * 0.34;
        forceX += (centerX / neighborCount - agent.x) * 0.055;
        forceY += (centerY / neighborCount - agent.y) * 0.055;
      }

      forceX += Math.sin(time * 1.45 + agent.phase) * 8;
      forceY += Math.cos(time * 1.25 + agent.phase * 1.2) * 8;
      const forceLength = Math.hypot(forceX, forceY);
      const maxForce = 440;
      if (forceLength > maxForce) {
        forceX = (forceX / forceLength) * maxForce;
        forceY = (forceY / forceLength) * maxForce;
      }

      agent.vx += forceX * delta;
      agent.vy += forceY * delta;
      const speed = Math.hypot(agent.vx, agent.vy);
      const maxSpeed = 220 + release * 90;
      if (speed > maxSpeed) {
        agent.vx = (agent.vx / speed) * maxSpeed;
        agent.vy = (agent.vy / speed) * maxSpeed;
      }

      agent.x += agent.vx * delta;
      agent.y += agent.vy * delta;
      agent.trailClock += delta;
      if (agent.trailClock >= TRAIL_INTERVAL) {
        agent.trail.push({ x: agent.x, y: agent.y });
        if (agent.trail.length > TRAIL_LENGTH) agent.trail.shift();
        agent.trailClock %= TRAIL_INTERVAL;
      }
    }
  }

  function drawAgents(time) {
    context.lineCap = 'round';
    context.lineJoin = 'round';

    agents.forEach((agent) => {
      const fadeIn = smoothstep(agent.bornAt, agent.bornAt + 0.34, time);
      const fadeOut = 1 - smoothstep(RELEASE_START + 0.12, TOTAL_TIME, time);
      const alpha = fadeIn * fadeOut;
      if (alpha <= 0.01) return;

      for (let i = 1; i < agent.trail.length; i += 1) {
        const previous = agent.trail[i - 1];
        const point = agent.trail[i];
        const trailProgress = i / (agent.trail.length - 1);
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(point.x, point.y);
        context.strokeStyle = `rgba(${agent.color}, 1)`;
        context.lineWidth = agent.size * (0.45 + trailProgress * 0.72);
        context.globalAlpha = alpha * trailProgress * 0.3;
        context.stroke();
      }

      context.fillStyle = `rgba(${agent.color}, 1)`;
      context.globalAlpha = alpha * 0.12;
      context.beginPath();
      context.arc(agent.x, agent.y, agent.size * 4.2, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = alpha * 0.42;
      context.beginPath();
      context.arc(agent.x, agent.y, agent.size * 2, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = alpha;
      context.beginPath();
      context.arc(agent.x, agent.y, agent.size * 0.72, 0, Math.PI * 2);
      context.fill();
    });
  }

  function finish(removeImmediately = false) {
    if (stopped) return;
    stopped = true;
    window.cancelAnimationFrame(frameId);
    window.removeEventListener('resize', resizeCanvas);
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('pagehide', handlePageHide);
    removeMotionListener();
    if (observer) observer.disconnect();

    if (!canvas) return;
    if (removeImmediately) {
      canvas.remove();
      return;
    }
    canvas.classList.add('swarm-intro--done');
    const finishedCanvas = canvas;
    window.setTimeout(() => finishedCanvas.remove(), 520);
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') finish(true);
  }

  function handlePageHide() {
    finish(true);
  }

  function animate(now) {
    if (stopped) return;
    const time = (now - startTime) / 1000;
    if (time >= TOTAL_TIME) {
      finish();
      return;
    }

    const delta = Math.min(0.034, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    const focus = getFocus(time);

    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';
    drawAmbientGlow(focus, time);
    updateAgents(delta, time, focus);
    drawAgents(time);
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';

    frameId = window.requestAnimationFrame(animate);
  }

  function start() {
    if (started || stopped || reducedMotion.matches) return;
    started = true;

    canvas = document.createElement('canvas');
    canvas.className = 'swarm-intro';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('role', 'presentation');
    context = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!context) {
      canvas.remove();
      return;
    }

    resizeCanvas();
    const focus = getFocus(0);
    const count = clamp(Math.round((width * height) / 14500), 42, 108);
    agents = Array.from({ length: count }, () => makeAgent(focus));
    document.body.append(canvas);

    startTime = performance.now();
    previousTime = startTime;
    frameId = window.requestAnimationFrame(animate);
    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('pagehide', handlePageHide, { once: true });

    const onMotionChange = (event) => {
      if (event.matches) finish(true);
    };
    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener('change', onMotionChange);
      removeMotionListener = () => reducedMotion.removeEventListener('change', onMotionChange);
    } else if (reducedMotion.addListener) {
      reducedMotion.addListener(onMotionChange);
      removeMotionListener = () => reducedMotion.removeListener(onMotionChange);
    }
  }

  if (boot.classList.contains('is-complete')) {
    window.setTimeout(start, 420);
  } else {
    observer = new MutationObserver(() => {
      if (!boot.classList.contains('is-complete')) return;
      observer.disconnect();
      window.setTimeout(start, 420);
    });
    observer.observe(boot, { attributes: true, attributeFilter: ['class'] });
  }
})();
