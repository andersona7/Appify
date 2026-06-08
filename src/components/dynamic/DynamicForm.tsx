'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EntityMetadata, FieldMetadata } from '@/types';
import { Loader2, Plus, Check } from 'lucide-react';

interface DynamicFormProps {
  appId: string;
  entity: EntityMetadata;
  recordId?: string; // If editing
  onSuccess?: () => void;
}

export default function DynamicForm({ appId, entity, recordId, onSuccess }: DynamicFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [asyncOptions, setAsyncOptions] = useState<Record<string, Array<{ value: string; label: string }>>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Access fields from metadata
  const fields: FieldMetadata[] = entity.fields || [];

  // 1. Build Zod validation schema dynamically
  const buildValidationSchema = () => {
    const shape: Record<string, any> = {};

    fields.forEach((field) => {
      let validator: z.ZodTypeAny = z.string();

      if (field.type === 'number') {
        validator = z.coerce.number();
      } else if (field.type === 'email') {
        validator = z.string().email('Invalid email address');
      } else if (field.type === 'date') {
        validator = z.string().min(1, 'Date is required');
      }

      if (field.required) {
        if (field.type === 'number') {
          validator = (validator as z.ZodNumber).min(0.001, `${field.label} is required`);
        } else {
          validator = (validator as z.ZodString).min(1, `${field.label} is required`);
        }
      } else {
        validator = validator.optional().or(z.literal(''));
      }

      shape[field.name] = validator;
    });

    return z.object(shape);
  };

  const schema = buildValidationSchema();

  // Initialize React Hook Form
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: fields.reduce((acc, field) => {
      acc[field.name] = field.defaultValue || '';
      return acc;
    }, {} as Record<string, any>),
  });

  // Watch values for conditional form fields
  const formValues = watch();

  // 2. Load Edit Data if recordId is provided
  useEffect(() => {
    if (recordId) {
      const fetchRecord = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/v1/apps/${appId}/entities/${entity.name}/${recordId}`);
          if (res.ok) {
            const result = await res.json();
            reset(result.data);
          }
        } catch (err) {
          console.error('Failed to load edit record:', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchRecord();
    }
  }, [appId, entity.name, recordId, reset]);

  // 3. Resolve Async Options for Selects (reference columns like project_id or user_id)
  useEffect(() => {
    const fetchAsyncOptions = async () => {
      const selectFields = fields.filter(f => f.type === 'select');
      for (const field of selectFields) {
        // If the field name ends with _id (like project_id), query the parent entity automatically
        if (field.name.endsWith('_id')) {
          const targetEntityName = field.name.replace('_id', '');
          try {
            const res = await fetch(`/api/v1/apps/${appId}/entities/${targetEntityName}`);
            if (res.ok) {
              const result = await res.json();
              const options = result.data.map((r: any) => ({
                value: r.id,
                label: r.data.name || r.data.title || r.data.company || r.id,
              }));
              setAsyncOptions(prev => ({ ...prev, [field.name]: options }));
            }
          } catch (err) {
            console.error(`Failed to fetch async options for ${field.name}:`, err);
          }
        }
      }
    };
    fetchAsyncOptions();
  }, [appId, fields]);

  // Form Submit Handler
  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setSubmitSuccess(false);
    setSubmitError(null);

    const method = recordId ? 'PUT' : 'POST';
    const url = recordId 
      ? `/api/v1/apps/${appId}/entities/${entity.name}/${recordId}`
      : `/api/v1/apps/${appId}/entities/${entity.name}`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to submit form data');
      }

      setSubmitSuccess(true);
      reset(); // Clear form on success
      
      if (onSuccess) {
        onSuccess();
      }

      // Hide success banner after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred during submission.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Conditional Rendering evaluator
  const shouldRenderField = (field: FieldMetadata) => {
    // E.g. Simple conditional field logic: 
    // If field is 'stage_won_details', render only if stage is 'Won'
    if (field.name === 'estimated_value' && formValues.status === 'Lost') {
      return false; // hide deal value if lead is lost
    }
    return true;
  };

  return (
    <div className="glass-panel border-slate-900 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-600 to-indigo-600"></div>
      
      <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
        <Plus className="w-5 h-5 text-violet-400" />
        {recordId ? `Edit ${entity.displayName}` : `Add New ${entity.displayName}`}
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {fields.map((field) => {
          if (!shouldRenderField(field)) return null;

          return (
            <div key={field.name} className="space-y-1.5">
              <label htmlFor={field.name} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>

              <Controller
                name={field.name}
                control={control}
                render={({ field: formField }) => {
                  if (field.type === 'textarea') {
                    return (
                      <textarea
                        {...formField}
                        id={field.name}
                        rows={3}
                        className="w-full bg-slate-950/65 border border-slate-850 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    );
                  }

                  if (field.type === 'select') {
                    const optionsList = asyncOptions[field.name] || 
                      (field.options?.map(o => ({ value: o, label: o })) || []);
                    
                    return (
                      <select
                        {...formField}
                        id={field.name}
                        className="w-full bg-slate-950/65 border border-slate-850 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select an option...</option>
                        {optionsList.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    );
                  }

                  if (field.type === 'checkbox') {
                    return (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id={field.name}
                          checked={formField.value === true || formField.value === 'true'}
                          onChange={(e) => formField.onChange(e.target.checked)}
                          className="w-4 h-4 bg-slate-950 border border-slate-800 rounded text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-300">Enabled</span>
                      </div>
                    );
                  }

                  // Default Fallback to standard input types
                  return (
                    <input
                      type={field.type}
                      id={field.name}
                      {...formField}
                      className="w-full bg-slate-950/65 border border-slate-850 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  );
                }}
              />

              {errors[field.name] && (
                <p className="text-xs text-red-400 mt-1">
                  {errors[field.name]?.message as string}
                </p>
              )}
            </div>
          );
        })}

        {submitSuccess && (
          <div className="bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 p-3 rounded-lg flex items-center gap-2 text-xs">
            <Check className="w-4 h-4 shrink-0" />
            <span>Record saved successfully!</span>
          </div>
        )}

        {submitError && (
          <div className="bg-red-950/20 border border-red-900/50 text-red-400 p-3 rounded-lg text-xs">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-violet-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Record...
            </>
          ) : (
            'Save Record'
          )}
        </button>
      </form>
    </div>
  );
}
