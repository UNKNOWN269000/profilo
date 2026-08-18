# Jaseem Nizardeen // Portfolio OS

A full-page cyberpunk portfolio for web developer **Jaseem Nizardeen**. The experience combines a live Three.js globe, GSAP scroll choreography, glass HUD modules, cursor telemetry, interactive project cards, and a Netlify-ready terminal contact form.

## Features

- Three.js holographic world with:
  - geographic coastlines and country borders
  - latitude/longitude graticule
  - Fresnel atmosphere shader
  - illuminated location beacons
  - orbital particle rings and a deep-space field
- ScrollTrigger-driven globe/camera path across every section
- Velocity-responsive pointer crosshair with live X/Y, pitch, and yaw telemetry
- Responsive capability diagnostics and projects matrix
- Accessible keyboard/focus states and reduced-motion support
- Netlify Forms-compatible terminal contact experience
- Graceful WebGL and remote-map fallbacks

## Run locally

This is a dependency-free static site; browser dependencies are loaded as pinned CDN assets.

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Then open `http://localhost:4173`.

## Project files

- `index.html` — semantic structure, portfolio copy, and HUD interface
- `style.css` — responsive visual system and component styles
- `main.js` — Three.js scene, map projection, GSAP motion, and interactions
- `netlify.toml` — static deployment, fallback routing, and security headers

## Deployment

Connect the repository to Netlify. No build command is required and the publish directory is the repository root. The contact form is automatically detected by Netlify during deploy.
