import { createApp } from '../server/app.js';

// Wrap the existing Express app for Vercel Serverless Functions
const app = createApp();

export default function handler(req, res) {
  return app(req, res);
}

