'use client';

import { useState, useEffect } from 'react';
import { EntityMetadata, WorkflowMetadata } from '@/types';
import { Play, Plus, ArrowDown, HelpCircle, Mail, AlertCircle, PlusCircle, Check, Loader2 } from 'lucide-react';

interface WorkflowBuilderClientProps {
  appId: string;
  entities: EntityMetadata[];
}

export default function WorkflowBuilderClient({ appId, entities }: WorkflowBuilderClientProps) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [triggerEntity, setTriggerEntity] = useState('');
  const [triggerEvent, setTriggerEvent] = useState<'record_created' | 'record_updated' | 'record_deleted'>('record_created');
  
  // Single condition state
  const [conditionField, setConditionField] = useState('');
  const [conditionOperator, setConditionOperator] = useState<'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'>('equals');
  const [conditionValue, setConditionValue] = useState('');

  // Single action state
  const [actionType, setActionType] = useState<'send_email' | 'notification' | 'create_record'>('notification');
  const [actionTargetEntity, setActionTargetEntity] = useState('');
  const [actionSubject, setActionSubject] = useState('');
  const [actionBody, setActionBody] = useState('');

  // Errors & Success
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch existing workflows
  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/apps/${appId}/workflows`);
      if (res.ok) {
        const result = await res.json();
        setWorkflows(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [appId]);

  // Find fields of selected trigger entity for condition selector
  const activeFields = entities.find(e => e.name === triggerEntity)?.fields || [];

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !triggerEntity) return;

    setIsLoading(true);
    setError(null);

    const workflowPayload = {
      name,
      trigger: {
        type: triggerEvent,
        entity: triggerEntity,
      },
      conditions: conditionField ? [
        {
          field: conditionField,
          operator: conditionOperator,
          value: conditionValue,
        }
      ] : [],
      actions: [
        {
          type: actionType,
          targetEntity: actionType === 'create_record' ? actionTargetEntity : undefined,
          data: actionType === 'create_record' ? {
            title: 'Auto generated related task',
          } : {
            subject: actionSubject,
            body: actionBody,
          }
        }
      ]
    };

    try {
      const res = await fetch(`/api/v1/apps/${appId}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowPayload),
      });

      if (!res.ok) {
        throw new Error('Failed to save new workflow in PostgreSQL database.');
      }

      setSuccess(true);
      setName('');
      setTriggerEntity('');
      setConditionField('');
      setConditionValue('');
      setActionSubject('');
      setActionBody('');
      setIsCreating(false);

      await fetchWorkflows(); // Reload list
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Play className="w-6 h-6 text-violet-400" />
            Visual Workflow Automation Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Trigger automatic email alerts or database updates dynamically when entity records change.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-md text-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? 'Cancel Creation' : 'Create Automation'}
        </button>
      </div>

      {success && (
        <div className="bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 p-4 rounded-xl flex items-center gap-2 text-xs">
          <Check className="w-4 h-4 shrink-0" />
          <span>Workflow rule successfully synchronized with execution triggers!</span>
        </div>
      )}

      {/* Workflow Builder Wizard Panel */}
      {isCreating && (
        <form onSubmit={handleCreateWorkflow} className="glass-panel border-slate-900 rounded-xl p-6 relative overflow-hidden space-y-6">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-600 to-indigo-600"></div>

          <h3 className="text-lg font-bold text-slate-100">Setup Automation Flow</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rule Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Send Alert on Won Lead"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-900">
            {/* Step 1: TRIGGER */}
            <div className="space-y-3 p-4 bg-slate-950/40 border border-slate-900/60 rounded-xl relative">
              <span className="absolute -top-3 left-4 bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                Step 1: Trigger
              </span>
              
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase">Trigger Entity</label>
                  <select
                    value={triggerEntity}
                    onChange={(e) => setTriggerEntity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">Select entity...</option>
                    {entities.map(e => (
                      <option key={e.name} value={e.name}>{e.displayName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase">Action Event</label>
                  <select
                    value={triggerEvent}
                    onChange={(e: any) => setTriggerEvent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="record_created">Record Created</option>
                    <option value="record_updated">Record Updated</option>
                    <option value="record_deleted">Record Deleted</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: CONDITION */}
            <div className="space-y-3 p-4 bg-slate-950/40 border border-slate-900/60 rounded-xl relative">
              <span className="absolute -top-3 left-4 bg-violet-900/60 border border-violet-700/60 text-violet-300 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                Step 2: Condition (Optional)
              </span>
              
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase">Target Field</label>
                  <select
                    value={conditionField}
                    onChange={(e) => setConditionField(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none"
                    disabled={!triggerEntity}
                  >
                    <option value="">No Condition (Always fire)</option>
                    {activeFields.map(f => (
                      <option key={f.name} value={f.name}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {conditionField && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-semibold uppercase">Operator</label>
                      <select
                        value={conditionOperator}
                        onChange={(e: any) => setConditionOperator(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not equals</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">&gt; Greater</option>
                        <option value="less_than">&lt; Less</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-semibold uppercase">Value</label>
                      <input
                        type="text"
                        value={conditionValue}
                        onChange={(e) => setConditionValue(e.target.value)}
                        placeholder="value..."
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: ACTION */}
            <div className="space-y-3 p-4 bg-slate-950/40 border border-slate-900/60 rounded-xl relative">
              <span className="absolute -top-3 left-4 bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                Step 3: Action
              </span>
              
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase">Action Type</label>
                  <select
                    value={actionType}
                    onChange={(e: any) => setActionType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="notification">Send Notification Alert</option>
                    <option value="send_email">Send Email Dispatch (Mock)</option>
                    <option value="create_record">Create Related Database Task</option>
                  </select>
                </div>

                {actionType === 'create_record' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase">Create Record Entity</label>
                    <select
                      value={actionTargetEntity}
                      onChange={(e) => setActionTargetEntity(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none"
                      required
                    >
                      <option value="">Select target...</option>
                      {entities.map(e => (
                        <option key={e.name} value={e.name}>{e.displayName}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={actionSubject}
                      onChange={(e) => setActionSubject(e.target.value)}
                      placeholder="Email Subject / Header Title"
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none"
                      required
                    />
                    <textarea
                      value={actionBody}
                      onChange={(e) => setActionBody(e.target.value)}
                      placeholder="Body message content..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none resize-none"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-950/20 border border-red-900/50 text-red-400 p-3 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer shadow-md"
            >
              {isLoading ? <Loader2 className="w-3 animate-spin" /> : 'Save Flow Rule'}
            </button>
          </div>
        </form>
      )}

      {/* Active Workflows display Flowcharts */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-200">Active Workflows ({workflows.length})</h2>
        
        {isLoading && workflows.length === 0 ? (
          <div className="text-center p-8 text-slate-500 text-xs">Loading flows...</div>
        ) : workflows.length === 0 ? (
          <div className="glass-panel border-slate-900 p-12 rounded-xl text-center text-slate-500 text-sm">
            No active workflows compiled. Click "Create Automation" above to define logic rules.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {workflows.map((flow) => (
              <div key={flow.id} className="glass-card rounded-xl p-5 border-slate-900 relative flex flex-col items-center">
                <div className="w-full flex justify-between items-center border-b border-slate-900 pb-3 mb-4">
                  <h4 className="font-bold text-sm text-slate-100 truncate max-w-[200px]" title={flow.name}>
                    {flow.name}
                  </h4>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-900/50 font-semibold uppercase tracking-wider">
                    Active
                  </span>
                </div>

                {/* FLOWCHART NODES */}
                <div className="flex flex-col items-center w-full space-y-4 font-mono text-xs">
                  
                  {/* Node 1: TRIGGER */}
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-center relative">
                    <span className="text-[9px] text-indigo-400 uppercase font-semibold block mb-1">TRIGGER</span>
                    <span className="text-slate-200">
                      When record in <strong className="text-slate-100">{flow.trigger.entity}</strong> is <strong className="text-slate-100">{flow.trigger.type.replace('record_', '')}</strong>
                    </span>
                  </div>

                  <ArrowDown className="w-5 h-5 text-indigo-500 animate-bounce" />

                  {/* Node 2: CONDITION */}
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-center relative">
                    <span className="text-[9px] text-violet-400 uppercase font-semibold block mb-1">CONDITIONS</span>
                    {flow.conditions && flow.conditions.length > 0 ? (
                      <span className="text-slate-200">
                        Check if <strong className="text-slate-100">{flow.conditions[0].field}</strong> {flow.conditions[0].operator.replace('_', ' ')} <strong className="text-slate-100">"{flow.conditions[0].value}"</strong>
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">No conditions (always runs)</span>
                    )}
                  </div>

                  <ArrowDown className="w-5 h-5 text-violet-500 animate-bounce" />

                  {/* Node 3: ACTION */}
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-center relative border-emerald-500/20">
                    <span className="text-[9px] text-emerald-400 uppercase font-semibold block mb-1">ACTION</span>
                    <span className="text-slate-200">
                      {flow.actions[0].type === 'create_record' ? (
                        <>Create related record in <strong className="text-slate-100">{flow.actions[0].targetEntity}</strong></>
                      ) : flow.actions[0].type === 'send_email' ? (
                        <span className="flex justify-center items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-emerald-400" /> Send Mock Email Alert</span>
                      ) : (
                        <>Send system banner notification</>
                      )}
                    </span>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
