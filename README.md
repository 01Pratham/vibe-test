<div align="center">
  <img src="ui/logo.svg" alt="Vibe Test Logo" width="120" height="120">
  <h1>@vibe-test/lib</h1>
</div>

A lightweight, auto-generating Postman-like UI for Express.js applications. Capture requests automatically, manage collections, and test your APIs with a premium interface directly from your browser.

## Features

- **🚀 Auto-Capture**: Automatically scans Express routes and captures metadata.
- **🚥 Traffic Interceptor**: Automatically logs all incoming request/response traffic to history.
- **📁 Collection Management**: Organize requests into logical groups.
- **🌍 Environment Variables**: Use variables like `{{BASE_URL}}` across your requests.
- **🧠 Intelligent Storage**: Use In-Memory storage for zero setup, or filesystem JSON storage for persistent data.
- **💎 Premium UI**: A full-featured, Postman-inspired dashboard built with React.
- **📦 Zero Dependencies**: Built with native `fetch` and minimal external requirements.

## Installation

```bash
npm install @vibe-test/lib
```

## Quick Start

```typescript
import express from 'express';
import { vibeTest } from '@vibe-test/lib';

const app = express();

// Mount Vibe Test at /api-tester
app.use(vibeTest({
    app,
    path: '/api-tester',
    autoCapture: true // Automatically capture all traffic
}));

app.listen(3000, () => {
    console.log('Vibe Test available at http://localhost:3000/api-tester');
});
```

## Customization

### Storage Options

By default, the library uses In-Memory storage (data is lost on restart). You can provide specific paths for JSON storage:

```typescript
app.use(vibeTest({
    app,
    storagePath: './data/cache.json',
    customizationPath: './data/custom.json'
}));
```

### Security

Add your own authentication middleware to protect the tester:

```typescript
app.use(vibeTest({
    app,
    authMiddleware: (req, res, next) => {
        if (req.user?.isAdmin) return next();
        res.status(403).send('Forbidden');
    }
}));
```

## Architecture

The library is designed to be extremely lightweight:
- Uses **Native Fetch** (Node 18+) for executing requests.
- **Zero-config** by default.
- **Split Storage**: Automatically separates auto-captured traffic from user-created tests.
- **SPA Dashboard**: The UI is served as static files for maximum performance.

## License

MIT
