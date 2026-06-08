'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface DynamicChartProps {
  appId: string;
  entityName: string;
  chartType?: 'line' | 'bar' | 'pie';
  targetField: string; // Column to group by (e.g. "status", "priority")
  title?: string;
}

interface ChartDataPoint {
  label: string;
  value: number;
}

export default function DynamicChart({ appId, entityName, chartType = 'bar', targetField, title }: DynamicChartProps) {
  const [dataPoints, setDataPoints] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAndAggregateData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Query all records for this entity
        const res = await fetch(`/api/v1/apps/${appId}/entities/${entityName}?limit=100`);
        if (!res.ok) {
          throw new Error('Failed to retrieve records for aggregation');
        }
        const result = await res.json();
        const records = result.data || [];

        // Aggregate records by target field value
        const counts: Record<string, number> = {};
        records.forEach((rec: any) => {
          const val = rec.data?.[targetField] || 'Unassigned';
          counts[val] = (counts[val] || 0) + 1;
        });

        const formatted = Object.entries(counts).map(([label, value]) => ({
          label,
          value,
        }));

        setDataPoints(formatted);
      } catch (err: any) {
        setError(err.message || 'Error occurred while loading chart data');
      } finally {
        setIsLoading(false);
      }
    };

    loadAndAggregateData();
  }, [appId, entityName, targetField]);

  if (isLoading) {
    return (
      <div className="glass-panel border-slate-900 rounded-xl p-6 h-72 flex flex-col justify-center items-center gap-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        Generating chart...
      </div>
    );
  }

  if (error || dataPoints.length === 0) {
    return (
      <div className="glass-panel border-slate-900 rounded-xl p-6 h-72 flex flex-col justify-center items-center text-center text-slate-500 text-sm">
        {error ? error : `No data available for chart "${title || 'Metrics'}" yet.`}
      </div>
    );
  }

  const maxValue = Math.max(...dataPoints.map(d => d.value), 1);
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div className="glass-panel border-slate-900 rounded-xl p-6 flex flex-col justify-between h-72 relative">
      <h3 className="text-sm font-bold text-slate-200 tracking-wide mb-4 uppercase">
        {title || `Metrics by ${targetField}`}
      </h3>

      <div className="relative flex-1 flex items-end justify-between w-full h-full pb-4">
        {/* Render Bar Chart */}
        {chartType === 'bar' && (
          <div className="flex w-full h-full items-end justify-around gap-2 pt-6">
            {dataPoints.map((dp, idx) => {
              const heightPercent = Math.min(100, (dp.value / maxValue) * 100);
              const color = colors[idx % colors.length];

              return (
                <div key={dp.label} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute bottom-[calc(heightPercent+8px)] bg-slate-950 border border-slate-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-bold whitespace-nowrap shadow-lg">
                    {dp.label}: {dp.value}
                  </div>
                  
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%`, backgroundColor: color }}
                    className="w-full max-w-[40px] rounded-t-md transition-all duration-500 ease-out group-hover:brightness-110 shadow-lg group-hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                  />
                  
                  {/* Label */}
                  <span className="text-[10px] text-slate-500 truncate max-w-[65px] mt-2 block font-mono">
                    {dp.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Render Line Chart */}
        {chartType === 'line' && (
          <div className="w-full h-full pt-6 relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="25" x2="100" y2="25" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />

              {/* Area Path & Line Path */}
              {(() => {
                const step = 100 / Math.max(1, dataPoints.length - 1);
                const points = dataPoints.map((dp, idx) => {
                  const x = idx * step;
                  const y = 90 - (dp.value / maxValue) * 80; // keep within 10-90% boundaries
                  return { x, y };
                });

                const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const areaPath = `${linePath} L 100 95 L 0 95 Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#line-grad)" />
                    <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
                    {points.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill="#c084fc"
                        stroke="#0f172a"
                        strokeWidth="1"
                        className="cursor-pointer hover:r-[5px] transition-all"
                      />
                    ))}
                  </>
                );
              })()}
            </svg>
            <div className="absolute bottom-0 left-0 w-full flex justify-between text-[8px] text-slate-500 font-mono px-1">
              {dataPoints.map((dp) => (
                <span key={dp.label} className="truncate max-w-[50px]">{dp.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Render Pie Chart */}
        {chartType === 'pie' && (
          <div className="flex w-full h-full items-center justify-center gap-6 pt-4">
            <svg className="w-32 h-32 overflow-visible" viewBox="0 0 100 100">
              {(() => {
                let accumulatedAngle = 0;
                const total = dataPoints.reduce((acc, dp) => acc + dp.value, 0);

                return dataPoints.map((dp, idx) => {
                  const angle = (dp.value / total) * 360;
                  const color = colors[idx % colors.length];

                  // Calculate path for pie slice
                  const x1 = 50 + 40 * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
                  const y1 = 50 + 40 * Math.sin((accumulatedAngle - 90) * Math.PI / 180);
                  
                  accumulatedAngle += angle;
                  
                  const x2 = 50 + 40 * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
                  const y2 = 50 + 40 * Math.sin((accumulatedAngle - 90) * Math.PI / 180);
                  
                  const largeArcFlag = angle > 180 ? 1 : 0;
                  const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                  return (
                    <path
                      key={dp.label}
                      d={pathData}
                      fill={color}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      className="transition-all duration-300 hover:brightness-110 cursor-pointer"
                    />
                  );
                });
              })()}
            </svg>
            {/* Legend */}
            <div className="flex flex-col gap-1.5 text-left max-h-[160px] overflow-y-auto pr-2">
              {dataPoints.map((dp, idx) => (
                <div key={dp.label} className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span
                    style={{ backgroundColor: colors[idx % colors.length] }}
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                  />
                  <span className="truncate max-w-[90px] font-mono">{dp.label} ({dp.value})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
