'use client';

import { useEffect, useState } from 'react';
import { EntityMetadata, FieldMetadata } from '@/types';
import { Search, ChevronDown, Trash2, ArrowUpDown, Edit, Eye, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface DynamicTableProps {
  appId: string;
  entity: EntityMetadata;
  onEditRecord?: (id: string) => void;
  refreshTrigger?: number;
}

export default function DynamicTable({ appId, entity, onEditRecord, refreshTrigger = 0 }: DynamicTableProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table parameters
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  
  // Custom Filters state
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Access fields
  const fields: FieldMetadata[] = entity.fields || [];

  // Set default visible columns (exclude password, limit count)
  useEffect(() => {
    const defaultCols = fields
      .filter(f => f.type !== 'password')
      .slice(0, 5)
      .map(f => f.name);
    setVisibleColumns(defaultCols);
  }, [entity]);

  // Fetch dynamic records from API
  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);

    // Build query parameters
    const queryParams = new URLSearchParams({
      page: currentPage.toString(),
      limit: '10',
      sort: `${sortField}:${sortOrder}`,
    });

    if (search.trim()) {
      queryParams.append('search', search);
    }

    // Append custom entity filters
    Object.entries(activeFilters).forEach(([key, val]) => {
      if (val) queryParams.append(`filter_${key}`, val);
    });

    try {
      const res = await fetch(`/api/v1/apps/${appId}/entities/${entity.name}?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load records from system database.');
      }
      const result = await res.json();
      setRecords(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Error occurred while fetching records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [appId, entity.name, currentPage, sortField, sortOrder, refreshTrigger, search, activeFilters]);

  // Handle delete row
  const handleDeleteRow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await fetch(`/api/v1/apps/${appId}/entities/${entity.name}/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== id));
        setSelectedRecords(prev => prev.filter(item => item !== id));
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedRecords.length} records?`)) return;
    try {
      const res = await fetch(`/api/v1/apps/${appId}/entities/${entity.name}?bulk=${selectedRecords.join(',')}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRecords(prev => prev.filter(r => !selectedRecords.includes(r.id)));
        setSelectedRecords([]);
      }
    } catch (err) {
      console.error('Failed to delete bulk records:', err);
    }
  };

  // Toggle selection
  const toggleSelectRecord = (id: string) => {
    setSelectedRecords(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map(r => r.id));
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Find filter options for Select/Dropdown fields
  const filterableFields = fields.filter(f => f.type === 'select');

  return (
    <div className="glass-panel border-slate-900 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Table Toolbar controls */}
      <div className="p-4 border-b border-slate-900 bg-slate-950/45 flex flex-col sm:flex-row gap-3 justify-between items-center">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder={`Search ${entity.displayName} records...`}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        {/* Filter dropdowns & Actions */}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          {filterableFields.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs transition-all cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
                <ChevronDown className="w-3 h-3" />
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 glass-panel rounded-lg p-3 shadow-xl z-30 border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 mb-2">Filter Records</h4>
                  <div className="space-y-3">
                    {filterableFields.map(field => (
                      <div key={field.name} className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-semibold">{field.label}</label>
                        <select
                          value={activeFilters[field.name] || ''}
                          onChange={(e) => {
                            setActiveFilters(prev => ({ ...prev, [field.name]: e.target.value }));
                            setCurrentPage(1);
                          }}
                          className="w-full bg-slate-900 border border-slate-850 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        >
                          <option value="">All</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bulk actions */}
          {selectedRecords.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-950/40 border border-red-900/60 hover:bg-red-900/40 text-red-400 px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedRecords.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Table view */}
      <div className="overflow-x-auto flex-1">
        {isLoading ? (
          <div className="p-12 flex flex-col justify-center items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            Loading records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-sm">{error}</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No records found. Create one using the form.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/20 border-b border-slate-900">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedRecords.length === records.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 bg-slate-950 border border-slate-800 rounded text-violet-600 focus:ring-violet-500"
                  />
                </th>
                {visibleColumns.map((colName) => {
                  const field = fields.find(f => f.name === colName);
                  return (
                    <th
                      key={colName}
                      onClick={() => handleSort(colName)}
                      className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {field?.label || colName}
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      </div>
                    </th>
                  );
                })}
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const recordData = record.data || {};
                const isSelected = selectedRecords.includes(record.id);

                return (
                  <tr
                    key={record.id}
                    className={`border-b border-slate-900/60 hover:bg-slate-900/20 transition-all ${isSelected ? 'bg-violet-950/10' : ''}`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRecord(record.id)}
                        className="w-4 h-4 bg-slate-950 border border-slate-850 rounded text-violet-600 focus:ring-violet-500"
                      />
                    </td>
                    {visibleColumns.map((colName) => {
                      const val = recordData[colName];
                      // Format cell based on type
                      const field = fields.find(f => f.name === colName);
                      let content = val !== undefined ? String(val) : '';

                      if (field?.type === 'checkbox') {
                        content = val === true || val === 'true' ? 'Enabled' : 'Disabled';
                      }

                      return (
                        <td key={colName} className="p-4 text-sm text-slate-300">
                          {field?.type === 'select' ? (
                            <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-xs text-violet-400 font-semibold">
                              {content}
                            </span>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                    {/* Row Actions */}
                    <td className="p-4 text-right flex justify-end gap-1.5">
                      {onEditRecord && (
                        <button
                          onClick={() => onEditRecord(record.id)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-100 rounded transition-all cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteRow(record.id)}
                        className="p-1.5 bg-red-950/20 hover:bg-red-950/50 border border-red-900/40 hover:border-red-900 text-red-400 hover:text-red-300 rounded transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination panel */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-900 bg-slate-950/45 flex justify-between items-center text-xs text-slate-400">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-300 hover:text-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-300 hover:text-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
