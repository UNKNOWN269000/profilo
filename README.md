# Jaseem Nizardeen // Portfolio OS

A full-page cyberpunk portfolio for web developer **Jaseem Nizardeen**. The experience combines a live Three.js globe, GSAP scroll choreography, glass HUD modules, cursor telemetry, interactive project cards, and a Netlify-ready terminal contact form.

## Features

- **Direct WhatsApp contact** to +94 75 982 5269 from six places: header button, floating action button, hero call-to-action, mobile menu, contact card, and a fallback link under the form (which carries any text already typed into the message)
- Plain-language interface copy, larger type, and clear focus states so visitors always know what to do next
- Three.js holographic world with:
  - geographic coastlines and country borders
  - latitude/longitude graticule
  - Fresnel atmosphere shader
  - illuminated location beacons
  - orbital particle rings and a deep-space field
- ScrollTrigger-driven globe/camera path across every section
- Velocity-responsive pointer crosshair with live X/Y, pitch, and yaw telemetry
- Responsive capability diagnostics and projects matrix
- Accessible keyboard/focus states, a visible system cursor, and reduced-motion support
- Netlify Forms-compatible contact form with friendly success and error messages
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

## Contact details

The WhatsApp number lives in two places — keep them in sync when it changes:

- `main.js` → `WHATSAPP_NUMBER` (normalises every `wa.me` link on load)
- `index.html` → the `href` on each `wa.me` link and the `tel:` link

## Deployment

Connect the repository to Netlify. No build command is required and the publish directory is the repository root. The contact form is automatically detected by Netlify during deploy.
