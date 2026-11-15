import express from 'express';

/** Compose HTTP adapters. Health means process alive, not database/simulator ready. */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/health', (_request, response) => {
    response.json({ service: 'drone-mission-backend', status: 'ok', phase: 'foundation' });
  });
  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
  app.use((error, _request, response, _next) => {
    const invalidBody = error.type === 'entity.parse.failed';
    const tooLarge = error.type === 'entity.too.large';
    response.status(invalidBody ? 400 : tooLarge ? 413 : 500).json({
      error: {
        code: invalidBody ? 'INVALID_JSON' : tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR',
        message: invalidBody ? 'Request body must be valid JSON' : tooLarge ? 'Request body exceeds limit' : 'Unexpected server error',
      },
    });
  });
  return app;
}
