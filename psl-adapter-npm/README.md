# PSL Adapter: npm

This adapter integrates ProxmoxVE Local with Nginx Proxy Manager (npm) by managing remote NPM servers and DNS hostnames for local services.

## What it does

- Manages one or more NPM servers
- Lets a user define multiple DNS names for internal services
- Creates proxy-host entries in NPM for each configured hostname
- Exposes a browser-friendly form definition for a management UI

## Browser-friendly form model

```ts
import adapter, { npmFormDefinition } from "psl-adapter-npm";

console.log(adapter.formSchema);
console.log(npmFormDefinition.sections.map((section) => section.title));
```

Example runtime config:

```ts
const config = {
  servers: [
    {
      id: "npm-1",
      name: "Main NPM",
      url: "https://npm.example.com",
      apiKey: "abc123",
      verifyTls: true,
    },
  ],
  dnsNames: [
    {
      id: "dns-1",
      serverId: "npm-1",
      hostname: "app.example.com",
      targetHost: "10.0.0.21",
      targetPort: 3000,
      protocol: "http",
      enabled: true,
    },
  ],
};
```

## Local development

```bash
npm install
npm run build
```
