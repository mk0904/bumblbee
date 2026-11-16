import { useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';

export function supportsDesktop({
  width,
  height,
  userAgent = '',
  touchPoints = 0,
  coarse = false,
}) {
  const mobile =
    /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(userAgent) || (touchPoints > 1 && coarse);
  return { mobile, supported: !mobile && width >= 1100 && height >= 650 };
}
function currentDisplay() {
  return supportsDesktop({
    width: window.innerWidth,
    height: window.innerHeight,
    userAgent: navigator.userAgent,
    touchPoints: navigator.maxTouchPoints,
    coarse: window.matchMedia?.('(pointer: coarse)').matches ?? false,
  });
}
/** Product intentionally targets desktop displays; do not render a compressed touch UI. */
export function DesktopOnly({ children }) {
  const [display, setDisplay] = useState(currentDisplay);
  useEffect(() => {
    const update = () => setDisplay(currentDisplay());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  if (display.supported) return children;
  return (
    <main className="desktop-required">
      <span className="desktop-required-mark">b.</span>
      <Monitor size={35} />
      <h1>{display.mobile ? 'Desktop only' : 'A little more room.'}</h1>
      <p>
        {display.mobile
          ? 'Open bumbl.bee on a desktop or laptop. Phones and tablets are not supported.'
          : 'Expand this window to at least 1100 × 650 to open the flight console.'}
      </p>
      <span>Desktop flight operations · no scrolling</span>
    </main>
  );
}
