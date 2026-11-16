import { useEffect, useState } from 'react';
import { Camera, Radio } from 'lucide-react';

/** Ephemeral media view. Flight state/commands stay on the existing application channel. */
export function CameraFeed({ enabled }) {
  const [frame, setFrame] = useState(null),
    [status, setStatus] = useState('waiting');
  useEffect(() => {
    if (!enabled) return;
    let stopped = false,
      socket,
      retry,
      lastFrame = 0;
    const connect = () => {
      socket = new WebSocket(
        `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/camera/viewer`,
      );
      socket.onmessage = ({ data }) => {
        let message;
        try {
          message = JSON.parse(data);
        } catch {
          return;
        }
        if (
          message.type === 'camera_frame' &&
          message.width === 640 &&
          message.height === 360 &&
          typeof message.jpeg === 'string' &&
          message.jpeg.length <= 200000
        ) {
          lastFrame = Date.now();
          setFrame(message);
          setStatus('live');
        } else if (
          message.type === 'camera_status' &&
          ['waiting', 'live', 'stale', 'disconnected'].includes(message.status)
        ) {
          setStatus(message.status === 'live' && !lastFrame ? 'waiting' : message.status);
        }
      };
      socket.onclose = ({ code }) => {
        if (stopped) return;
        setStatus('disconnected');
        if (code !== 4003) retry = setTimeout(connect, 1500);
      };
      socket.onerror = () => socket.close();
    };
    connect();
    const timer = setInterval(() => {
      if (lastFrame && Date.now() - lastFrame > 3000)
        setStatus((current) => (current === 'live' ? 'stale' : current));
    }, 500);
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearInterval(timer);
      socket?.close();
    };
  }, [enabled]);
  const live = enabled && status === 'live';
  return (
    <div className={`camera-feed ${live ? 'is-live' : ''}`} aria-label="Onboard camera feed">
      {frame && enabled && (
        <img
          src={`data:image/jpeg;base64,${frame.jpeg}`}
          alt="Live Webots onboard camera"
          onError={() => setStatus('stale')}
        />
      )}
      {!live && (
        <div className="camera-feed-state" role="status">
          <Camera size={28} />
          <strong>
            {!enabled
              ? 'Camera unavailable in demo mode'
              : status === 'stale'
                ? 'Camera feed stale'
                : status === 'disconnected'
                  ? 'Camera disconnected'
                  : 'Waiting for camera'}
          </strong>
          <span>
            {enabled
              ? 'Run Webots with the camera bridge connected.'
              : 'Connect a Webots agent to view its onboard camera.'}
          </span>
        </div>
      )}
      <div className={`camera-feed-badge ${live ? 'live' : ''}`}>
        <Radio size={11} />
        {live ? 'LIVE · ONBOARD' : enabled ? status.toUpperCase() : 'WEBOTS ONLY'}
      </div>
      <span className="camera-feed-spec">640 × 360 · JPEG · 5 FPS TARGET</span>
    </div>
  );
}
