# PSL Adapter: npm

This repository is the first integration adapter for pve-scripts-local, focused on the npm ecosystem.

## What it does

- Fetches package metadata from the npm registry
- Searches npm packages by query text
- Returns normalized results for use in the integrations modal

## Example

```ts
import { fetchNpmPackageInfo, searchNpmPackages } from "psl-adapter-npm";

const info = await fetchNpmPackageInfo("next");
console.log(info.name, info.version);

const results = await searchNpmPackages("proxmox", 5);
console.log(results);
```

## Local development

```bash
npm install
npm run build
```
