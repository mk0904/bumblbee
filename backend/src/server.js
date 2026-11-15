import { createServer } from 'node:http';
import { createApp } from './interfaces/http/create-app.js';
import { createRuntime } from './infrastructure/runtime.js';
import { attachWebSockets } from './interfaces/websockets.js';

const port = Number(process.env.PORT ?? 3000),
  host = process.env.HOST ?? '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be between 1 and 65535');
const context = await createRuntime();
const server = createServer(createApp(context));
const closeSockets = attachWebSockets(server, context);
server.listen(port, host, () =>
  console.info(
    JSON.stringify({
      event: 'server_started',
      host,
      port,
      mode: context.gateway.mode,
      storage: context.repository.kind,
    }),
  ),
);
server.on('error', (error) => {
  console.error(JSON.stringify({ event: 'server_error', code: error.code }));
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    await closeSockets();
    server.close();
    await context.close();
    process.exitCode = 0;
  });
