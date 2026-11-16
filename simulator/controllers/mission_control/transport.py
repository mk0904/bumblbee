"""Bounded socket worker. Only the Webots main thread accesses robot devices."""
from collections import deque
import json
import os
import queue
import threading
import time
import uuid
from pathlib import Path
import urllib.request
import websocket


def load_environment(path):
    for line in Path(path).read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('\"\''))


def validate_command_envelope(command):
    if not isinstance(command, dict) or command.get('action') not in ('START_MISSION', 'PAUSE', 'RESUME', 'LAND'):
        raise ValueError('Invalid command envelope')
    for key in ('id', 'flightId'):
        uuid.UUID(command[key])
    if not isinstance(command.get('expiresAt'), str):
        raise ValueError('Missing command expiry')
    return command


class BridgeTransport:
    def __init__(self, root):
        load_environment(root / 'backend/.env')
        self.url = os.environ.get('BACKEND_URL', 'http://127.0.0.1:3000').rstrip('/')
        self.token = os.environ['SIMULATOR_TOKEN']
        self.epoch = str(uuid.uuid4())
        self.incoming = queue.Queue(16)
        self.outgoing = queue.Queue(128)
        self.last_ack = 0
        self.connected = False
        self.failed = False
        threading.Thread(target=self.run, daemon=True).start()

    def send(self, kind, payload):
        try:
            self.outgoing.put_nowait({'protocolVersion': 1, 'type': kind, 'payload': payload})
        except queue.Full:
            self.failed = True

    def run(self):
        try:
            request = urllib.request.Request(self.url + '/api/pairing/request', data=b'{}',
                headers={'Authorization': 'Bearer ' + self.token, 'Content-Type': 'application/json'})
            with urllib.request.urlopen(request, timeout=10) as response:
                pairing = json.load(response)
            print(json.dumps({'event': 'bridge_pairing', 'code': pairing['code'],
                              'expiresAt': pairing['expiresAt']}), flush=True)
            socket = websocket.create_connection(self.url.replace('http', 'ws', 1) + '/ws/simulator',
                header={'Authorization': 'Bearer ' + self.token}, timeout=5, enable_multithread=True)
            socket.send(json.dumps({'protocolVersion': 1, 'type': 'hello',
                                   'droneId': 'drone-01', 'epochId': self.epoch}))
            hello = json.loads(socket.recv())
            if hello.get('type') != 'welcome' or hello.get('epochId') != self.epoch:
                raise ValueError('Handshake failed')
            socket.settimeout(0.02)
            self.connected = True
            self.last_ack = time.monotonic()
            print(json.dumps({'event': 'bridge_connected', 'epochId': self.epoch}), flush=True)
            heartbeat = 0
            telemetry = deque(maxlen=32)
            outstanding = None
            sequence = 0
            while not self.failed:
                now = time.monotonic()
                if now - heartbeat >= 1:
                    socket.send(json.dumps({'protocolVersion': 1, 'type': 'heartbeat'}))
                    heartbeat = now
                for _ in range(8):
                    try:
                        event = self.outgoing.get_nowait()
                        if event['type'] == 'telemetry':
                            if telemetry and telemetry[-1]['payload']['state'] == event['payload']['state']:
                                telemetry[-1] = event
                            else:
                                if len(telemetry) == telemetry.maxlen:
                                    raise ValueError('State telemetry overflow')
                                telemetry.append(event)
                        else:
                            socket.send(json.dumps(event, allow_nan=False))
                    except queue.Empty:
                        break
                if outstanding is None and telemetry:
                    event = telemetry.popleft()
                    sequence += 1
                    event['payload']['sequence'] = sequence
                    outstanding = sequence
                    socket.send(json.dumps(event, allow_nan=False))
                try:
                    raw = socket.recv()
                except websocket.WebSocketTimeoutException:
                    continue
                if not raw or len(raw) > 65536:
                    raise ValueError('Invalid socket payload')
                message = json.loads(raw)
                if message.get('protocolVersion') != 1:
                    raise ValueError('Protocol mismatch')
                if message.get('type') == 'heartbeat_ack':
                    self.last_ack = now
                elif message.get('type') == 'telemetry_ack':
                    if message.get('epochId') != self.epoch or message.get('sequence') != outstanding:
                        raise ValueError('Invalid telemetry acknowledgement')
                    outstanding = None
                elif message.get('type') == 'command':
                    command = validate_command_envelope(message.get('payload'))
                    self.incoming.put_nowait(command)
                else:
                    raise ValueError('Unexpected message')
        except Exception as error:
            print(json.dumps({'event': 'bridge_disconnected', 'errorType': type(error).__name__}), flush=True)
        finally:
            self.connected = False
            self.failed = True
