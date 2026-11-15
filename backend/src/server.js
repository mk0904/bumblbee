import { createApp } from './interfaces/http/create-app.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}
const host = process.env.HOST ?? '127.0.0.1';
const server = createApp().listen(port, host, () => {
  console.info(JSON.stringify({ event: 'server_started', host, port }));
});
server.on('error', (error) => {
  console.error(JSON.stringify({ event: 'server_error', code: error.code }));
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(() => { process.exitCode = 0; });
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
