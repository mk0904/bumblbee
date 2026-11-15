import { useRef, useState } from 'react';
import { Crosshair, Minus, Plus, Navigation, MousePointer2 } from 'lucide-react';

const px = (x) => (x + 50) * 6,
  py = (y) => (50 - y) * 6;
/** Local XY visualization; world footprint is a planned training ground, not a geographical map. */
export function WorldMap({
  waypoints = [],
  sample,
  trail = [],
  editable = false,
  onAdd,
  onMove,
  selected = -1,
  onSelect,
  compact = false,
}) {
  const svg = useRef(null),
    dragging = useRef(null);
  const [zoom, setZoom] = useState(1);
  const offset = 300 - 300 / zoom,
    size = 600 / zoom;
  const point = (event) => {
    const matrix = svg.current.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return {
      x: Math.max(-50, Math.min(50, Math.round((p.x / 6 - 50) * 10) / 10)),
      y: Math.max(-50, Math.min(50, Math.round((50 - p.y / 6) * 10) / 10)),
    };
  };
  const route = [[0, 0], ...waypoints.map((w) => [w.x, w.y])]
    .map(([x, y]) => `${px(x)},${py(y)}`)
    .join(' ');
  return (
    <div className={`world-map ${compact ? 'compact' : ''}`}>
      <div className="map-label">
        <span className="pulse-dot" /> TRAINING GROUND <span>LOCAL XY · METRES</span>
      </div>
      <svg
        ref={svg}
        viewBox={`${offset} ${offset} ${size} ${size}`}
        aria-label={
          editable
            ? 'Mission map: click to add waypoint, drag markers to move'
            : 'Live drone position in the local training world'
        }
        onPointerDown={(event) => {
          if (!editable || dragging.current !== null) return;
          if (event.button !== 0) return;
          const p = point(event);
          if (p) onAdd?.(p);
        }}
        onPointerMove={(event) => {
          if (editable && dragging.current !== null) {
            const p = point(event);
            if (p) onMove?.(dragging.current, p);
          }
        }}
        onPointerUp={() => {
          dragging.current = null;
        }}
        onPointerCancel={() => {
          dragging.current = null;
        }}
      >
        <defs>
          <pattern id="smallGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M30 0H0V30" fill="none" stroke="#303234" strokeWidth="0.65" />
          </pattern>
          <pattern id="largeGrid" width="150" height="150" patternUnits="userSpaceOnUse">
            <rect width="150" height="150" fill="url(#smallGrid)" />
            <path d="M150 0H0V150" fill="none" stroke="#434649" strokeWidth="0.8" />
          </pattern>
          <radialGradient id="mapGlow">
            <stop stopColor="#43464a" stopOpacity=".3" />
            <stop offset="1" stopColor="#1a1b1d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="600" height="600" fill="#1a1b1d" />
        <circle cx="300" cy="270" r="330" fill="url(#mapGlow)" />
        <path
          d="M-30 160Q70 220 150 170T350 170T650 90M-20 180Q80 240 160 190T360 190T660 110M-40 500Q140 370 220 440T630 400M-40 520Q140 390 220 460T630 420"
          stroke="#3f4245"
          strokeWidth="1"
          fill="none"
          opacity=".48"
        />
        <rect width="600" height="600" fill="url(#largeGrid)" />
        <rect
          x="18"
          y="18"
          width="564"
          height="564"
          rx="3"
          stroke="#93989d"
          strokeDasharray="6 7"
          strokeOpacity=".3"
          fill="none"
        />
        <g fill="#282a2c" stroke="#4f5256" strokeWidth="1">
          <rect x="65" y="80" width="100" height="57" />
          <rect x="70" y="85" width="90" height="47" />
          <rect x="440" y="400" width="85" height="105" />
          <rect x="445" y="405" width="75" height="95" />
          <rect x="67" y="435" width="65" height="40" />
        </g>
        <g fill="#7f848a" fontSize="8" fontFamily="monospace">
          <text x="76" y="115">
            HANGAR A
          </text>
          <text x="455" y="453">
            STORAGE
          </text>
          <text x="70" y="492">
            SCENERY ONLY
          </text>
        </g>
        <circle cx="300" cy="300" r="22" stroke="#62666b" fill="#2e3033" />
        <circle cx="300" cy="300" r="17" stroke="#80858b" strokeDasharray="3 3" fill="none" />
        <text x="300" y="305" textAnchor="middle" fill="#b2b5b8" fontSize="16" fontWeight="600">
          H
        </text>
        {trail.length > 1 && (
          <polyline
            points={trail.map((t) => `${px(t.x)},${py(t.y)}`).join(' ')}
            fill="none"
            stroke="#d0d2d5"
            strokeWidth="2.5"
            opacity=".8"
          />
        )}
        {waypoints.length > 0 && (
          <polyline
            points={route}
            fill="none"
            stroke="#d4e4b2"
            strokeWidth="1.8"
            strokeDasharray="6 5"
            opacity=".8"
          />
        )}
        {waypoints.map((w, i) => (
          <g
            key={i}
            transform={`translate(${px(w.x)},${py(w.y)})`}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-label={`Waypoint ${i + 1}, X ${w.x}, Y ${w.y}`}
            style={{ cursor: editable ? 'grab' : 'default' }}
            onKeyDown={(event) => {
              if (editable && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                onSelect?.(i);
              }
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              if (editable) {
                dragging.current = i;
                svg.current.setPointerCapture(event.pointerId);
                onSelect?.(i);
              }
            }}
          >
            <circle
              r={selected === i ? 17 : 13}
              fill="#1d1e1f"
              stroke="#d4e4b2"
              strokeWidth={selected === i ? 2 : 1.2}
            />
            <text y="4" textAnchor="middle" fill="#d4d6d8" fontSize="10" fontWeight="600">
              {String(i + 1).padStart(2, '0')}
            </text>
          </g>
        ))}
        {sample && (
          <g transform={`translate(${px(sample.x)},${py(sample.y)})`}>
            <circle r="22" fill="#d4e4b2" fillOpacity=".1" stroke="#d4e4b2" strokeOpacity=".3" />
            <g transform={`rotate(${90 - (sample.yaw * 180) / Math.PI})`} fill="#d4e4b2">
              <path d="M0 -12L8 9L0 5L-8 9Z" />
            </g>
          </g>
        )}
        <g fontFamily="monospace" fontSize="8" fill="#73787e">
          <text x="303" y="30">
            +50 Y
          </text>
          <text x="303" y="575">
            −50 Y
          </text>
          <text x="535" y="296">
            +50 X
          </text>
          <text x="25" y="296">
            −50 X
          </text>
        </g>
      </svg>
      <div className="map-compass">
        <Navigation size={15} />
        <span>+Y</span>
      </div>
      <div className="map-tools">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
        >
          <Plus size={16} />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
        >
          <Minus size={16} />
        </button>
        <button title="Reset view" aria-label="Reset map view" onClick={() => setZoom(1)}>
          <Crosshair size={16} />
        </button>
      </div>
      <div className="map-footer">
        <span>
          {editable ? (
            <>
              <MousePointer2 size={12} /> CLICK TO ADD · DRAG TO MOVE
            </>
          ) : (
            <>
              <span className="legend-line" /> PLANNED ROUTE <span className="legend-solid" />{' '}
              RECORDED PATH
            </>
          )}
        </span>
        <span>20 m ━━━━━</span>
      </div>
    </div>
  );
}
