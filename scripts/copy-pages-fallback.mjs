import { copyFile } from 'node:fs/promises';

const browserOutput = new URL('../dist/real-estate-calculator/browser/', import.meta.url);
await copyFile(new URL('index.html', browserOutput), new URL('404.html', browserOutput));
