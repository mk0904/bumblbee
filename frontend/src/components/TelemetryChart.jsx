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
  if (!samples.length) return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <ChartPlot samples={samples} metric={metric} height={height} />
    </Suspense>
  );
}
