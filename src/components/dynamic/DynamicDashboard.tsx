'use client';

import { useEffect, useState } from 'react';
import { Layers, DollarSign, ListTodo, Loader2 } from 'lucide-react';

interface MetricConfig {
  label: string;
  entity: string;
  operation: 'count' | 'sum' | 'avg';
  field?: string;
}

interface DynamicDashboardProps {
  appId: string;
  title?: string;
  description?: string;
  metrics?: MetricConfig[];
}

export default function DynamicDashboard({ appId, title, description, metrics = [] }: DynamicDashboardProps) {
  const [metricValues, setMetricValues] = useState<Record<string, { value: number; isLoading: boolean; error: boolean }>>({});

  useEffect(() => {
    metrics.forEach((metric) => {
      // Initialize loading state
      const key = `${metric.entity}_${metric.operation}_${metric.field || ''}`;
      setMetricValues((prev) => ({
        ...prev,
        [key]: { value: 0, isLoading: true, error: false },
      }));

      const fetchAndCalculateMetric = async () => {
        try {
          const res = await fetch(`/api/v1/apps/${appId}/entities/${metric.entity}?limit=1000`);
          if (!res.ok) throw new Error('API request failed');
          
          const result = await res.json();
          const records = result.data || [];

          let val = 0;
          if (metric.operation === 'count') {
            val = records.length;
          } else if (metric.operation === 'sum' || metric.operation === 'avg') {
            const fieldName = metric.field;
            if (!fieldName) {
              val = 0;
            } else {
              const numbers = records
                .map((r: any) => Number(r.data?.[fieldName]))
                .filter((n: any) => !isNaN(n));
              
              const total = numbers.reduce((acc: number, cur: number) => acc + cur, 0);
              val = metric.operation === 'sum' ? total : (numbers.length ? total / numbers.length : 0);
            }
          }

          setMetricValues((prev) => ({
            ...prev,
            [key]: { value: val, isLoading: false, error: false },
          }));
        } catch (err) {
          console.error(`Error calculating metric for ${metric.entity}:`, err);
          setMetricValues((prev) => ({
            ...prev,
            [key]: { value: 0, isLoading: false, error: true },
          }));
        }
      };

      fetchAndCalculateMetric();
    });
  }, [appId, metrics]);

  // Helper to resolve suitable icon for metric labels
  const getIcon = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('value') || lower.includes('amount') || lower.includes('revenue') || lower.includes('sales') || lower.includes('$')) {
      return <DollarSign className="w-5 h-5 text-emerald-400" />;
    }
    if (lower.includes('task') || lower.includes('todo') || lower.includes('project')) {
      return <ListTodo className="w-5 h-5 text-indigo-400" />;
    }
    return <Layers className="w-5 h-5 text-violet-400" />;
  };

  return (
    <div className="space-y-6 w-full">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">{title || 'Analytics Dashboard'}</h2>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => {
          const key = `${metric.entity}_${metric.operation}_${metric.field || ''}`;
          const state = metricValues[key] || { value: 0, isLoading: true, error: false };

          // Format value: currency format if name matches, or decimal points
          const isCurrency = metric.label.toLowerCase().includes('value') || metric.label.toLowerCase().includes('revenue') || metric.label.toLowerCase().includes('$');
          let displayValue = String(state.value);
          if (isCurrency) {
            displayValue = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(state.value);
          } else if (state.value % 1 !== 0) {
            displayValue = state.value.toFixed(1);
          }

          return (
            <div
              key={index}
              className="relative glass-card rounded-xl p-5 overflow-hidden flex justify-between items-center group"
            >
              {/* Subtle background card glows */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl group-hover:bg-violet-600/10 transition-colors"></div>

              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">
                  {metric.label}
                </span>

                {state.isLoading ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                    Calculating...
                  </div>
                ) : state.error ? (
                  <div className="text-xs text-red-400">Calculation error</div>
                ) : (
                  <h4 className="text-3xl font-extrabold text-slate-100 tracking-tight">
                    {displayValue}
                  </h4>
                )}
              </div>

              {/* Metric Card Icon bubble */}
              <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center shadow-inner group-hover:border-violet-500/20 transition-all">
                {getIcon(metric.label)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
