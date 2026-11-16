import { useEffect, useRef, useState } from 'react';
import { RotateCcw, ZoomOut, ZoomIn, Navigation, MousePointer2 } from 'lucide-react';

import yardTexture from '../../../shared/worlds/training-yard.jpg?url';
import { world, worldToMap, mapToWorld } from '../lib/world-map.js';
const px = (x) => worldToMap(x, 0).x,
  py = (y) => worldToMap(0, y).y;
/** Same canonical texture and metre extents as Webots; markers are interaction overlays. */
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
  zoomKey,
  toolbarExtras,
  fill = false,
}) {
  const surface = useRef(null);
  const svg = useRef(null),
    dragging = useRef(null);
  const [zoom, updateZoom] = useState(() => {
    if (!zoomKey) return 1;
    try {
      const saved = Number(sessionStorage.getItem(`map-zoom:${zoomKey}`));
      return saved >= 1 && saved <= 4 ? saved : 1;
    } catch { return 1; }
  });
  const setZoom = (change) => {
    const next = typeof change === 'function' ? change(zoom) : change;
    updateZoom(next);
    if (zoomKey) {
      try { sessionStorage.setItem(`map-zoom:${zoomKey}`, String(next)); } catch { /* Storage is optional. */ }
    }
  };
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const element = surface.current;
    if (compact || !element) return;
    const wheel = (event) => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      const next = Math.min(4, Math.max(1, zoomRef.current * Math.exp(-delta * (event.ctrlKey ? 0.012 : 0.002))));
      zoomRef.current = next;
      updateZoom(next);
      if (zoomKey) {
        try { sessionStorage.setItem(`map-zoom:${zoomKey}`, String(next)); } catch { /* Storage is optional. */ }
      }
    };
    // Non-passive listener consumes wheel/pinch gestures without scrolling the page.
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [compact, zoomKey]);
  const offset = 300 - 300 / zoom,
    size = 600 / zoom;
  const point = (event) => {
    const matrix = svg.current.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return mapToWorld(p.x, p.y);
  };
  const route = [[0, 0], ...waypoints.map((w) => [w.x, w.y])]
    .map(([x, y]) => `${px(x)},${py(y)}`)
    .join(' ');
  return (
    <div ref={surface} className={`world-map ${compact ? 'compact' : ''}`}>
      <svg
        ref={svg}
        preserveAspectRatio={fill ? 'xMidYMid slice' : 'xMidYMid meet'}
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
        <image
          href={yardTexture}
          x="0"
          y="0"
          width="600"
          height="600"
          aria-label="Training yard — exact Webots ground map"
        />
        <rect
          x={px(world.flightBounds.min)}
          y={py(world.flightBounds.max)}
          width={px(world.flightBounds.max) - px(world.flightBounds.min)}
          height={py(world.flightBounds.min) - py(world.flightBounds.max)}
          fill="none"
          stroke="#f4df91"
          strokeWidth="0.8"
          strokeDasharray="5 5"
          pointerEvents="none"
        />
        {trail.length > 1 && (
          <polyline
            points={trail.map((t) => `${px(t.x)},${py(t.y)}`).join(' ')}
            fill="none"
            stroke="#d0d2d5"
            strokeWidth={2.5 / zoom}
            opacity=".8"
          />
        )}
        {waypoints.length > 0 && (
          <g pointerEvents="none" aria-label="Planned mission route">
            <polyline points={route} fill="none" stroke="#17131ee6" strokeWidth={compact ? 4 : 6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={route} fill="none" stroke="#e0bcff" strokeWidth={compact ? 2 : 3} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            {waypoints.map((w,i) => {
              const previous = i ? waypoints[i-1] : {x:0,y:0};
              const x1=px(previous.x),y1=py(previous.y),x2=px(w.x),y2=py(w.y);
              if(Math.hypot(x2-x1,y2-y1)<8/zoom) return null;
              return <path key={i} d={`M${-5/zoom} ${-4/zoom}L${2/zoom} 0L${-5/zoom} ${4/zoom}`} transform={`translate(${(x1+x2)/2} ${(y1+y2)/2}) rotate(${Math.atan2(y2-y1,x2-x1)*180/Math.PI})`} fill="none" stroke="#fff0ff" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />;
            })}
          </g>
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
              r={(selected === i ? 10 : 8) / zoom}
              fill={selected === i ? '#d8b4f3' : '#272130'}
              stroke="#f1ddff"
              vectorEffect="non-scaling-stroke"
              strokeWidth={selected === i ? 2.5 : 1.5}
            />
            <circle r={1.5 / zoom} fill="#e8dfee" />
            <text
              y={-15 / zoom}
              textAnchor="middle"
              fill="#efe9f4"
              stroke="#1d1b1f"
              strokeWidth={3 / zoom}
              paintOrder="stroke"
              fontSize={(compact ? 14 : 11) / zoom}
              fontWeight="600"
            >
              {String(i + 1).padStart(2, '0')}
            </text>
          </g>
        ))}
        {sample && (
          <g transform={`translate(${px(sample.x)},${py(sample.y)})`}>
            <circle
              r={22 / zoom}
              fill="#cdbadc"
              fillOpacity=".1"
              stroke="#cdbadc"
              strokeOpacity=".3"
            />
            <g
              transform={`rotate(${90 - (sample.yaw * 180) / Math.PI}) scale(${1 / zoom})`}
              fill="#cdbadc"
            >
              <path d="M0 -12L8 9L0 5L-8 9Z" />
            </g>
          </g>
        )}
        <g className="map-scale" pointerEvents="none" fontFamily="monospace" fill="#e9e1ef">
          <path
            d={`M${offset + size * 0.07} ${offset + size * 0.93}h${100 / zoom}`}
            stroke="#e9e1ef"
            strokeWidth={1.5 / zoom}
          />
          <text x={offset + size * 0.07} y={offset + size * 0.93 - 5 / zoom} fontSize={8 / zoom}>
            {Number((20 / zoom).toFixed(1))} m
          </text>
        </g>
      </svg>
      <div className="map-compass">
        <Navigation size={15} />
        <span>+Y</span>
      </div>
      {!compact && (
        <div className="map-tools">
          {toolbarExtras}
          <button
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          >
            <ZoomIn size={16} />
          </button>
          <button
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          >
            <ZoomOut size={16} />
          </button>
          <button title="Reset view" aria-label="Reset map view" onClick={() => setZoom(1)}>
            <RotateCcw size={16} />
          </button>
        </div>
      )}
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
        <span>Flight area ±50 m</span>
      </div>
    </div>
  );
}
