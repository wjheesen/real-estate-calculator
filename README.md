# Real Estate Calculator

Compare buying, keeping and renting, or selling property against your household budget. The app stores its working data in IndexedDB on the current device. Use **Export** to download a ZIP backup and **Import** to restore one. A successful import replaces the current planner data.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm start
```

The Angular dev server opens on port 4200 by default.

## Verify changes

Install Chrome or Chromium for Karma. Set `CHROME_BIN` to the browser executable if Karma cannot find it.

```sh
npm run test:ci
npm run build
npx playwright install chromium
npm run e2e -- --retries=0
```

Use `npm run e2e -- --retries=0 --repeat-each=2` to check the browser journeys twice with fresh browser contexts.

## GitHub Pages

Run `npm run build:gh-pages` to build for `/real-estate-calculator/`. The browser output is in `dist/real-estate-calculator/browser/`. The command copies `index.html` to `404.html` so Pages can serve Angular deep links such as `/real-estate-calculator/portfolio/1`.

In the GitHub repository, select **Settings → Pages → Build and deployment → Source → GitHub Actions**. Once the workflow is on `main`, pushes to `main` and manual runs of **Deploy GitHub Pages** build the project, run Karma, and publish the browser output. The workflow run shows the deployment URL.
