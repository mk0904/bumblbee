import express from 'express';
import { originAllowed } from '../origin.js';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { DomainError, invariant } from '../../domain/model.js';
import { dashboardSnapshot } from '../../application/services.js';

const waypoint = z
  .object({ x: z.number().finite(), y: z.number().finite(), altitude: z.number().finite() })
  .strict();
const missionInput = z
  .object({
    name: z.string().min(1).max(80),
    description: z.string().max(500).optional(),
    waypoints: z.array(waypoint).max(20),
    revision: z.number().int().positive().optional(),
  })
  .strict();
const startInput = z
  .object({ missionId: z.string().uuid(), revision: z.number().int().positive() })
  .strict();
const uuid = (value) => z.string().uuid().parse(value);
const key = (req) => z.string().min(8).max(100).parse(req.get('Idempotency-Key'));

export function createApp(context) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set('X-Request-Id', req.requestId);
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/health', (_req, res) =>
    res.json({ service: 'drone-mission-backend', status: 'ok', phase: 'application' }),
  );
  if (context) {
    const { auth, services, repository, gateway, publish, config } = context;
    app.get('/api/auth/config', (_req, res) =>
      res.json({ demo: config.mode === 'demo' && !config.production }),
    );
    app.post(
      '/api/pairing/request',
      rateLimit({ windowMs: 60000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }),
      (req, res) => {
        auth.verifyBridge(req.get('Authorization'));
        res.json(auth.requestPairing());
      },
    );
    const finishSession = (res, result) =>
      res
        .set('Set-Cookie', auth.cookie(result.token))
        .json({ user: result.session.user, csrf: result.session.csrf });
    app.post(
      '/api/pairing/claim',
      rateLimit({ windowMs: 60000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }),
      (req, res) => {
        invariant(
          originAllowed(config, req.get('Origin')),
          'ORIGIN_REJECTED',
          'Pair from the configured dashboard origin',
          403,
        );
        const { code } = z
          .object({ code: z.string().regex(/^[A-Z0-9]{4}$/i) })
          .strict()
          .parse(req.body);
        finishSession(res, auth.pair(code));
      },
    );
    app.post('/api/pairing/demo', (req, res) => {
      invariant(
        config.mode === 'demo' && !config.production,
        'DEMO_DISABLED',
        'Local demo pairing is disabled',
        403,
      );
      invariant(
        originAllowed(config, req.get('Origin')),
        'ORIGIN_REJECTED',
        'Open the configured local dashboard',
        403,
      );
      finishSession(res, auth.issueSession());
    });
    app.use('/api', (req, _res, next) => {
      req.session = auth.session(req);
      if (!req.session) throw new DomainError('UNAUTHENTICATED', 'Sign in to continue', 401);
      if (!['GET', 'HEAD'].includes(req.method))
        invariant(
          req.get('X-CSRF-Token') === req.session.csrf,
          'CSRF_REJECTED',
          'Invalid request token',
          403,
        );
      next();
    });
    app.get('/api/auth/me', (req, res) =>
      res.json({ user: req.session.user, csrf: req.session.csrf }),
    );
    app.post('/api/auth/logout', (req, res) => {
      auth.logout(req);
      res.set('Set-Cookie', auth.cookie('', true)).sendStatus(204);
    });
    app.get('/api/dashboard', async (req, res) =>
      res.json(await dashboardSnapshot(repository, gateway, req.session.user.id)),
    );
    app.post('/api/missions', async (req, res) =>
      res
        .status(201)
        .json(await services.mission.save(req.session.user.id, missionInput.parse(req.body))),
    );
    app.patch('/api/missions/:id', async (req, res) =>
      res.json(
        await services.mission.save(
          req.session.user.id,
          missionInput.required({ revision: true }).parse(req.body),
          uuid(req.params.id),
        ),
      ),
    );
    app.delete('/api/missions/:id', async (req, res) => {
      await services.mission.archive(req.session.user.id, uuid(req.params.id));
      res.sendStatus(204);
    });
    app.post('/api/flights', async (req, res) =>
      res
        .status(202)
        .json(
          await services.flight.start(req.session.user.id, startInput.parse(req.body), key(req)),
        ),
    );
    app.post('/api/flights/:id/commands', async (req, res) => {
      const { action } = z
        .object({ action: z.enum(['PAUSE', 'RESUME', 'LAND']) })
        .strict()
        .parse(req.body);
      res
        .status(202)
        .json(
          await services.flight.action(req.session.user.id, uuid(req.params.id), action, key(req)),
        );
    });
    app.post('/api/flights/:id/reconcile', async (req, res) => {
      await services.flight.reconcile(req.session.user.id, uuid(req.params.id));
      res.sendStatus(204);
    });
    app.get('/api/flights/:id/report', async (req, res) =>
      res.json(await services.report.get(req.session.user.id, uuid(req.params.id))),
    );
    app.post('/api/alerts/:id/acknowledgement', async (req, res) => {
      await services.telemetry.acknowledge(req.session.user.id, uuid(req.params.id));
      res.sendStatus(204);
    });
    app.post('/api/demo/inject', async (req, res) => {
      invariant(
        config.mode === 'demo',
        'DEMO_DISABLED',
        'Demo controls are unavailable in Webots mode',
        403,
      );
      const { kind } = z
        .object({ kind: z.enum(['battery', 'disconnect', 'reconnect']) })
        .parse(req.body);
      await gateway.inject(kind);
      publish();
      res.sendStatus(204);
    });
  }
  if (context)
    app.use(express.static(fileURLToPath(new URL('../../../../frontend/dist/', import.meta.url))));
  app.use((_req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
  );
  app.use((error, req, res, _next) => {
    const invalidJson = error.type === 'entity.parse.failed',
      tooLarge = error.type === 'entity.too.large';
    const invalid = error instanceof z.ZodError;
    const databaseConflict = ['23505', '23503', '40001', '40P01'].includes(error.code);
    const status = databaseConflict
      ? 409
      : error instanceof DomainError
        ? error.status
        : invalidJson
          ? 400
          : tooLarge
            ? 413
            : invalid
              ? 422
              : 500;
    if (status === 500)
      console.error(
        JSON.stringify({ event: 'request_error', requestId: req.requestId, error: error.message }),
      );
    res.status(status).json({
      error: {
        code: databaseConflict
          ? 'CONCURRENT_CHANGE'
          : error instanceof DomainError
            ? error.code
            : invalidJson
              ? 'INVALID_JSON'
              : tooLarge
                ? 'PAYLOAD_TOO_LARGE'
                : invalid
                  ? 'VALIDATION_ERROR'
                  : 'INTERNAL_ERROR',
        message:
          error instanceof DomainError
            ? error.message
            : invalidJson
              ? 'Request body must be valid JSON'
              : tooLarge
                ? 'Request body exceeds limit'
                : invalid
                  ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
                  : 'Unexpected server error',
        requestId: req.requestId,
      },
    });
  });
  return app;
}
