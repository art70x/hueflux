# Hueflux

A static, dependency-light color utility for developers and interface designers.

**Live stack:** HTML, CSS and JavaScript modules. No build step, framework, server-side code or package manager required.

## Features

- Auto-detect CSS colors, including HEX, RGB, HSL, OKLab, OKLCH and Display P3.
- Accept bare RGB values (`99 102 241`) and bare HSL values (`220 18% 17%`).
- Convert to HEX, RGB, HSL, OKLCH, OKLab and Display P3.
- Copy individual values or the complete output, including CSS custom-property and Tailwind CSS v4 snippets.
- Check sRGB and Display P3 gamut membership.
- Check WCAG contrast ratios and AA/AAA thresholds.
- Calculate APCA Lc using the `apca-w3` implementation. APCA is advisory, not a WCAG 2.1 conformance criterion.
- Responsive layout, keyboard-operable tabs, visible focus indicators and reduced-motion support.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Semantic app markup and page metadata |
| `global.css` | Design system, layout and responsive styling |
| `app.js` | Color parsing, conversion, gamut, contrast and interactions |
| `_headers` | Security and caching headers for Cloudflare Pages |
| `favicon.svg` | Lightweight brand mark |

## Run locally

Because the app uses JavaScript modules, serve the directory over HTTP:

```bash
python -m http.server 8080
```

Open <http://localhost:8080>.

No install or build command is needed. Culori and apca-w3 are loaded from pinned jsDelivr ESM URLs.

## Publish with GitHub + Cloudflare Pages

1. Create a new GitHub repository, for example `hueflux`.
2. Put the contents of this project at the repository root.
3. Commit and push the files to GitHub.
4. In Cloudflare, open **Workers & Pages → Create → Pages → Connect to Git**.
5. Authorize GitHub and select the repository.
6. Configure the deployment:
   - **Production branch:** `main` (or your chosen default branch)
   - **Framework preset:** `None`
   - **Build command:** leave empty
   - **Build output directory:** `.` (repository root)
   - **Root directory:** leave empty
7. Save and deploy. Cloudflare assigns a `*.pages.dev` address.
8. Future pushes to the production branch deploy automatically. Other branches can receive preview deployments.

Do not add a build command: this is a static site and `index.html` is already the entry point.

## Optional: deploy with Wrangler

If you prefer a manual deployment from a local terminal:

```bash
npx wrangler pages deploy . --project-name hueflux
```

This command uploads the current directory. Run it from the project root.

## Notes and limitations

- The contrast checker expects opaque colors. Alpha transparency is not composited over the background before calculating contrast.
- HEX/RGB/HSL preview values are clipped to sRGB when necessary. The original input is still used for gamut detection and perceptual color-space conversion.
- Display P3 output is provided for modern wide-gamut displays; actual appearance depends on the display and browser.
- External modules are pinned to specific versions. For a fully self-hosted deployment, vendor the ESM dependencies and update the imports in `app.js`.
- `_headers` applies security headers and a short cache policy to HTML, CSS, and JavaScript. Cloudflare Pages serves `favicon.svg` as a static asset.

## License

MIT. Add a `LICENSE` file with your preferred copyright notice before distributing the project if you want to publish it under that license.
