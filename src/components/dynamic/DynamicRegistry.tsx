'use client';

import { ComponentMetadata, EntityMetadata } from '@/types';
import DynamicForm from './DynamicForm';
import DynamicTable from './DynamicTable';
import DynamicChart from './DynamicChart';
import DynamicDashboard from './DynamicDashboard';
import { AlertTriangle } from 'lucide-react';

interface DynamicRegistryProps {
  appId: string;
  component: ComponentMetadata;
  entities: EntityMetadata[];
  onRefresh?: () => void;
  refreshTrigger?: number;
}

export default function DynamicRegistry({ appId, component, entities, onRefresh, refreshTrigger }: DynamicRegistryProps) {
  // Find matching entity definition if components targets one
  const targetEntity = entities.find(e => e.name === component.entity);

  switch (component.type) {
    case 'form':
      if (!targetEntity) {
        return <FallbackError title="Form Configuration Error" message={`Target entity "${component.entity}" not found.`} />;
      }
      return (
        <DynamicForm
          appId={appId}
          entity={targetEntity}
          onSuccess={onRefresh}
        />
      );

    case 'table':
      if (!targetEntity) {
        return <FallbackError title="Table Configuration Error" message={`Target entity "${component.entity}" not found.`} />;
      }
      return (
        <DynamicTable
          appId={appId}
          entity={targetEntity}
          refreshTrigger={refreshTrigger}
        />
      );

    case 'chart':
      if (!component.entity) {
        return <FallbackError title="Chart Configuration Error" message="Missing entity target in chart configuration." />;
      }
      return (
        <DynamicChart
          appId={appId}
          entityName={component.entity}
          chartType={component.config?.chartType}
          targetField={component.config?.columns?.[0] || 'status'}
          title={component.config?.title}
        />
      );

    case 'dashboard':
      return (
        <DynamicDashboard
          appId={appId}
          title={component.config?.title}
          description={component.config?.description}
          metrics={component.config?.metrics}
        />
      );

    default:
      return (
        <FallbackError
          title="Unsupported Component"
          message={`Component registry encountered an unknown component type: "${component.type}"`}
        />
      );
  }
}

function FallbackError({ title, message }: { title: string; message: string }) {
  return (
    <div className="glass-panel border-amber-900/50 bg-amber-950/15 text-amber-400 p-5 rounded-xl flex items-start gap-3 w-full my-4">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <h4 className="font-semibold text-sm text-amber-300">{title}</h4>
        <p className="text-xs text-slate-400 mt-1">{message}</p>
      </div>
    </div>
  );
}
