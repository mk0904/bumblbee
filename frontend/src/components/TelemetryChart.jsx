import { lazy, Suspense } from 'react';
const ChartPlot = lazy(() => import('./ChartPlot.jsx'));

export function TelemetryChart({ samples = [], metric = 'altitude', height = 155 }) {
  const placeholder = (
    <div className="chart-empty" style={{ height }}>
      <span className="chart-dashes">— — — — — — —</span>
      <span>
        {samples.length ? 'Loading chart…' : 'Telemetry will appear when a flight starts'}
      </span>
    </div>
  );
  if (!samples.length) return (
    <div className="empty-telemetry-graph" role="img" aria-label={`${metric === 'battery' ? 'Battery' : 'Altitude'} graph, no samples yet. Horizontal axis: Time (s). Vertical axis: ${metric === 'battery' ? 'Battery (%)' : 'Altitude (m)'}.`} style={{height}}>
      <svg viewBox="0 0 360 180" preserveAspectRatio="none" aria-hidden="true">
        <g stroke="#ffffff0c" strokeWidth="1">
          {[25,52.5,80,107.5,135].map(y=><line key={y} x1="50" x2="342" y1={y} y2={y} />)}
          {[50,123,196,269,342].map(x=><line key={x} y1="25" y2="135" x1={x} x2={x} />)}
        </g>
        <path d="M50 25V135H342" fill="none" stroke="#ffffff25" />
        <g fill="#aaa2b4" fontSize="10" fontFamily="DM Sans, sans-serif">
          {[0,1,2,3].map(i=><text key={i} x="42" y={138-i*110/3} textAnchor="end">{metric === 'battery' ? Math.round(i*100/3) : i*5}</text>)}
          {[0,15,30,45,60].map((v,i)=><text key={v} x={50+i*73} y="151" textAnchor="middle">{v}</text>)}
          <text x="196" y="173" textAnchor="middle">Time (s)</text>
          <text transform="translate(13 80) rotate(-90)" textAnchor="middle">{metric === 'battery' ? 'Battery (%)' : 'Altitude (m)'}</text>
        </g>
      </svg>
    </div>
  );
  return (
    <Suspense fallback={placeholder}>
      <ChartPlot samples={samples} metric={metric} height={height} />
    </Suspense>
  );
}
