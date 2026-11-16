"""Latest-only camera worker. Sensor access stays in Webots' main thread."""
import base64
import io
import json
import queue
import threading
import time
from PIL import Image
import websocket


class CameraStream:
    def __init__(self, transport):
        self.transport = transport
        self.frames = queue.Queue(1)
        self.dropped = 0
        threading.Thread(target=self.run, daemon=True).start()

    def offer(self, image, width, height, simulation_time):
        """Nonblocking copied BGRA frame handoff; never wait for an encoder/socket."""
        item = (bytes(image), width, height, simulation_time)
        try:
            self.frames.put_nowait(item)
        except queue.Full:
            try:
                self.frames.get_nowait()
            except queue.Empty:
                pass
            self.dropped += 1
            try:
                self.frames.put_nowait(item)
            except queue.Full:
                pass

    def run(self):
        sequence = 0
        while not self.transport.failed:
            if not self.transport.connected:
                time.sleep(0.1)
                continue
            socket = None
            try:
                socket = websocket.create_connection(
                    self.transport.url.replace('http', 'ws', 1) + '/ws/camera/producer',
                    header={'Authorization': 'Bearer ' + self.transport.token}, timeout=2)
                socket.send(json.dumps({'protocolVersion':1,'type':'camera_hello',
                    'droneId':'drone-01','epochId':self.transport.epoch}))
                if json.loads(socket.recv()).get('type') != 'camera_welcome':
                    raise ValueError('Camera handshake failed')
                print(json.dumps({'event':'camera_connected','width':640,'height':360,'targetFps':5}),flush=True)
                sequence = 0
                last_send = 0
                while self.transport.connected and not self.transport.failed:
                    try:
                        raw, width, height, sim_time = self.frames.get(timeout=1)
                    except queue.Empty:
                        continue
                    # One outstanding frame; ACK and one-slot queue bound media memory.
                    if time.monotonic()-last_send < 0.2:
                        time.sleep(0.2-(time.monotonic()-last_send))
                    image = Image.frombytes('RGBA',(width,height),raw,'raw','BGRA').convert('RGB')
                    if image.size != (640,360):
                        image = image.resize((640,360))
                    encoded = io.BytesIO()
                    image.save(encoded,format='JPEG',quality=65)
                    jpeg = encoded.getvalue()
                    if len(jpeg)>150000:
                        continue
                    sequence += 1
                    socket.send(json.dumps({'protocolVersion':1,'type':'camera_frame',
                        'epochId':self.transport.epoch,'sequence':sequence,'simulationTime':sim_time,
                        'width':640,'height':360,'jpeg':base64.b64encode(jpeg).decode('ascii')}))
                    last_send = time.monotonic()
                    ack = json.loads(socket.recv())
                    if ack.get('type') != 'camera_ack' or ack.get('sequence') != sequence:
                        raise ValueError('Invalid camera acknowledgement')
            except Exception as error:
                # Media failure never changes motor state or the command transport.
                print(json.dumps({'event':'camera_disconnected','errorType':type(error).__name__}),flush=True)
                time.sleep(1)
            finally:
                if socket:
                    socket.close()
