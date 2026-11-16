import { useRef, useState } from 'react';
import { Crosshair, Minus, Plus, Navigation, MousePointer2 } from 'lucide-react';

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
    return mapToWorld(p.x, p.y);
  };
  const route = [[0, 0], ...waypoints.map((w) => [w.x, w.y])]
    .map(([x, y]) => `${px(x)},${py(y)}`)
    .join(' ');
  return (
    <div className={`world-map ${compact ? 'compact' : ''}`}>
      <div className="map-label">
        <span className="pulse-dot" /> TRAINING YARD <span>WEBOTS MAP · METRES</span>
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
          <polyline
            points={route}
            fill="none"
            stroke="#cdbadc"
            strokeWidth={1.8 / zoom}
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
              r={(selected === i ? 10 : 8) / zoom}
              fill="#1d1e1f25"
              stroke="#cdbadc"
              strokeWidth={(selected === i ? 2 : 1.2) / zoom}
            />
            <circle r={1.5 / zoom} fill="#e8dfee" />
            <text
              y={-15 / zoom}
              textAnchor="middle"
              fill="#efe9f4"
              stroke="#1d1b1f"
              strokeWidth={3 / zoom}
              paintOrder="stroke"
              fontSize={10 / zoom}
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
          <button
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          >
            <Plus size={16} />
          </button>
          <button
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          >
            <Minus size={16} />
          </button>
          <button title="Reset view" aria-label="Reset map view" onClick={() => setZoom(1)}>
            <Crosshair size={16} />
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
        <span>120 × 120 m YARD · FLIGHT AREA ±50 m</span>
      </div>
    </div>
  );
}
