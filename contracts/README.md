# External interfaces

- [WebSocket and bridge protocol](protocol.md): command outcomes, telemetry ordering, epochs, persistence acknowledgements and camera channels.
- [REST OpenAPI reference](openapi.json): implemented route inventory. Request validation is executable in backend/src/interfaces/http/create-app.js.

Protocol version1 is implemented by the backend and Python Webots controller. Real integration reports are retained in docs/evidence/webots. The root README documents the deployment envelope and known recovery/security limits.
