import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { CameraFeed } from '../src/components/CameraFeed.jsx';
let socket;
class FakeSocket {
  constructor() {
    socket = this;
  }
  close() {
    this.onclose?.({ code: 1000 });
  }
  receive(value) {
    this.onmessage({ data: JSON.stringify(value) });
  }
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
test('camera moves from waiting to live, marks silence stale and closes on unmount', () => {
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', FakeSocket);
  const { unmount } = render(<CameraFeed enabled />);
  expect(screen.getByText('Waiting for camera')).toBeTruthy();
  act(() => socket.receive({ type: 'camera_frame', width: 640, height: 360, jpeg: 'example' }));
  expect(screen.getByAltText('Live Webots onboard camera')).toBeTruthy();
  expect(screen.getByText('LIVE · ONBOARD')).toBeTruthy();
  act(() => vi.advanceTimersByTime(3500));
  expect(screen.getByText('Camera feed stale')).toBeTruthy();
  const close = vi.spyOn(socket, 'close');
  unmount();
  expect(close).toHaveBeenCalledOnce();
});
test('demo camera never opens a media connection', () => {
  const constructor = vi.fn();
  vi.stubGlobal('WebSocket', constructor);
  render(<CameraFeed enabled={false} />);
  expect(screen.getByText('Camera unavailable in demo mode')).toBeTruthy();
  expect(constructor).not.toHaveBeenCalled();
});
