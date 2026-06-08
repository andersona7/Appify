'use client';

import { useState } from 'react';
import { ComponentMetadata, EntityMetadata, PageMetadata } from '@/types';
import DynamicRegistry from './DynamicRegistry';

interface PageRendererClientProps {
  appId: string;
  page: {
    id: string;
    slug: string;
    title: string;
    layout: any; // page layout components
  };
  entities: EntityMetadata[];
}

export default function PageRendererClient({ appId, page, entities }: PageRendererClientProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Parse components
  const components: ComponentMetadata[] = Array.isArray(page.layout)
    ? (page.layout as any)
    : JSON.parse(page.layout as string);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Determine grid columns based on components count
  // E.g., if there's a form and a table, put them side by side
  const hasForm = components.some(c => c.type === 'form');
  const hasTable = components.some(c => c.type === 'table');
  const gridClass = hasForm && hasTable 
    ? 'grid grid-cols-1 lg:grid-cols-3 gap-8 items-start' 
    : 'grid grid-cols-1 gap-8';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
      
      {/* Page Header banner */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">{page.title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic viewport loading from registered workspace schemas
          </p>
        </div>
      </div>

      {/* Components Grid rendering viewport */}
      <div className={gridClass}>
        {components.map((component, idx) => {
          // Calculate column span: Form gets 1 column, Table gets 2 columns in side-by-side mode
          let colSpanClass = '';
          if (hasForm && hasTable) {
            if (component.type === 'table') colSpanClass = 'lg:col-span-2';
            else colSpanClass = 'lg:col-span-1';
          }

          return (
            <div key={idx} className={colSpanClass}>
              <DynamicRegistry
                appId={appId}
                component={component}
                entities={entities}
                onRefresh={handleRefresh}
                refreshTrigger={refreshTrigger}
              />
            </div>
          );
        })}
      </div>

    </div>
  );
}
