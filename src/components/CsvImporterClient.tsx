'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { EntityMetadata, FieldMetadata } from '@/types';
import { Upload, ArrowRight, Table, CheckCircle2, AlertTriangle, Loader2, Play } from 'lucide-react';

interface CsvImporterClientProps {
  appId: string;
  entities: EntityMetadata[];
}

export default function CsvImporterClient({ appId, entities }: CsvImporterClientProps) {
  const [selectedEntityName, setSelectedEntityName] = useState('');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({}); // EntityField -> CSVHeader
  const [step, setStep] = useState(1); // 1: Select/Upload, 2: Map Fields, 3: Preview/Import
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const activeEntity = entities.find(e => e.name === selectedEntityName);
  const activeFields: FieldMetadata[] = activeEntity
    ? activeEntity.fields
    : [];

  // 1. Parse CSV File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError('The uploaded CSV file is empty.');
          return;
        }
        setCsvData(results.data);
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          // Auto-map matching names
          const initialMap: Record<string, string> = {};
          activeFields.forEach(field => {
            const match = results.meta.fields?.find(h => h.toLowerCase() === field.name.toLowerCase() || h.toLowerCase() === field.label.toLowerCase());
            if (match) initialMap[field.name] = match;
          });
          setMappings(initialMap);
        }
        setStep(2);
      },
      error: (err) => {
        setError(`CSV Parse Error: ${err.message}`);
      }
    });
  };

  // 2. Perform field validations for preview
  const validateRecord = (record: any) => {
    const errors: string[] = [];
    activeFields.forEach(field => {
      const mappedHeader = mappings[field.name];
      const val = record[mappedHeader];

      if (field.required && (!val || String(val).trim() === '')) {
        errors.push(`"${field.label}" is required`);
      }
      if (field.type === 'number' && val && isNaN(Number(val))) {
        errors.push(`"${field.label}" must be a numeric value`);
      }
    });
    return errors;
  };

  // 3. Execute bulk inserts
  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    let successCount = 0;

    try {
      for (const row of csvData) {
        const payload: Record<string, any> = {};
        
        activeFields.forEach(field => {
          const mappedHeader = mappings[field.name];
          const val = row[mappedHeader];
          if (val !== undefined && val !== null) {
            payload[field.name] = field.type === 'number' ? Number(val) : val;
          }
        });

        // Post record
        const res = await fetch(`/api/v1/apps/${appId}/entities/${selectedEntityName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        }
      }

      setSuccessCount(successCount);
      setStep(1);
      setCsvData([]);
      setCsvHeaders([]);
      setMappings({});
      setSelectedEntityName('');
    } catch (err: any) {
      setError(`Import partially failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="glass-panel border-slate-900 rounded-xl p-6 relative overflow-hidden space-y-6">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-600 to-indigo-600"></div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Upload className="w-5 h-5 text-violet-400" />
          CSV Data Ingestion Portal
        </h3>
        <span className="text-xs text-slate-500 font-mono">Step {step} of 3</span>
      </div>

      {successCount !== null && (
        <div className="bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 p-4 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Successfully imported {successCount} records into the entity namespace!</span>
        </div>
      )}

      {error && (
        <div className="bg-red-950/20 border border-red-900/50 text-red-400 p-3 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* STEP 1: Select Entity & Upload File */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">1. Select Target Database Table</label>
            <select
              value={selectedEntityName}
              onChange={(e) => setSelectedEntityName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">Choose entity...</option>
              {entities.map(e => (
                <option key={e.name} value={e.name}>{e.displayName}</option>
              ))}
            </select>
          </div>

          {selectedEntityName && (
            <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/20 hover:border-violet-500/20 transition-colors relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h4 className="font-semibold text-sm text-slate-300">Choose CSV File to Upload</h4>
              <p className="text-xs text-slate-500 mt-1">Accepts standard .csv format with headers</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Map CSV Headers to Entity Fields */}
      {step === 2 && activeEntity && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-200">Map Columns for {activeEntity.displayName}</h4>
            <p className="text-xs text-slate-500 mt-1">Associate each database field with a column header in your CSV file.</p>
          </div>

          <div className="space-y-3">
            {activeFields.map(field => (
              <div key={field.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-200">{field.label}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    {field.type} {field.required && '(Required)'}
                  </span>
                </div>
                <select
                  value={mappings[field.name] || ''}
                  onChange={(e) => setMappings(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none w-56"
                >
                  <option value="">Ignore field</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setStep(1)}
              className="bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-xs cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer shadow-md"
            >
              Continue to Preview
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview Data & Execute Import */}
      {step === 3 && activeEntity && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-200">Import Preview (First 5 records)</h4>
            <p className="text-xs text-slate-500 mt-1">Review validation checks before running import script.</p>
          </div>

          <div className="overflow-x-auto border border-slate-900 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/45 border-b border-slate-900 text-slate-400 uppercase">
                  <th className="p-3">Status</th>
                  {activeFields.map(f => (
                    <th key={f.name} className="p-3">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 5).map((row, idx) => {
                  const errors = validateRecord(row);
                  const hasErrors = errors.length > 0;

                  return (
                    <tr key={idx} className="border-b border-slate-900/40 hover:bg-slate-900/10">
                      <td className="p-3">
                        {hasErrors ? (
                          <span className="flex items-center gap-1 text-amber-500" title={errors.join(', ')}>
                            <AlertTriangle className="w-3.5 h-3.5" /> Invalid
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                        )}
                      </td>
                      {activeFields.map(field => {
                        const header = mappings[field.name];
                        return (
                          <td key={field.name} className="p-3 text-slate-300">
                            {row[header] || <span className="text-slate-600 italic">empty</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Total records to process: {csvData.length}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer shadow-md disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Execute Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
