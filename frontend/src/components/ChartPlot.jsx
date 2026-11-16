import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function ChartPlot({ samples = [], metric = 'altitude', height = 155 }) {
  if (!samples.length)
    return (
      <div className="chart-empty" style={{ height }}>
        <span className="chart-dashes">— — — — — — —</span>
        <span>Telemetry will appear when a flight starts</span>
      </div>
    );
  const color = 'var(--chart-line)';
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1}>
        <AreaChart data={samples} margin={{ top: 12, right: 8, bottom: 18, left: 8 }}>
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="simulationTime"
            height={36}
            label={{ value: 'Time (s)', position: 'insideBottom', offset: -8, fill: 'var(--chart-label)', fontSize: 10 }}
            stroke="var(--chart-axis)"
            tickLine={false}
            axisLine={false}
            minTickGap={45}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${Math.round(v)}s`}
          />
          <YAxis
            width={45}
            label={{ value: metric === 'battery' ? 'Battery (%)' : 'Altitude (m)', angle: -90, position: 'insideLeft', offset: 0, fill: 'var(--chart-label)', fontSize: 10 }}
            stroke="var(--chart-axis)"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            domain={metric === 'battery' ? [0, 100] : [0, 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--chart-tooltip)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              color: 'var(--chart-text)',
              fontSize: 12,
            }}
            labelFormatter={(v) => `${Number(v).toFixed(1)} simulation seconds`}
            formatter={(v) => [
              `${Number(v).toFixed(1)} ${metric === 'battery' ? '%' : 'm'}`,
              metric,
            ]}
          />
          <Area
            type="linear"
            dataKey={metric}
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${metric})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
