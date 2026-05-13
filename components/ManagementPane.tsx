import React, { useState, useMemo } from 'react';
import { PlusIcon, TrashIcon, EditIcon, PrinterIcon } from './icons';
import { Modal } from './Modal';
import { Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ManagementPaneProps<T> {
  title: string;
  items: T[];
  columns: { 
    key: keyof T; 
    header: string; 
    render?: (item: T) => React.ReactNode;
    filterable?: boolean;
    filterOptions?: { value: unknown; label: string }[];
    sortable?: boolean;
  }[];
  onDeleteItem: (id: string) => void;
  onEditItem?: (item: T) => void;
  onViewItem?: (item: T) => void;
  renderForm: (onClose: () => void) => React.ReactNode;
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  customActions?: (item: T) => React.ReactNode;
  renderHeaderActions?: () => React.ReactNode;
  alwaysShowFilters?: boolean;
}

export const ManagementPane = <T extends { id: string }>({
  title,
  items = [],
  columns = [],
  onDeleteItem,
  onEditItem,
  onViewItem,
  renderForm,
  modalSize = 'lg',
  customActions,
  renderHeaderActions,
  alwaysShowFilters = false,
}: ManagementPaneProps<T>) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});
  const [showFilters, setShowFilters] = useState(alwaysShowFilters);
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredItems = useMemo(() => {
    let result = (items || []).filter((item) => {
      // Search logic
      const matchesSearch = searchTerm === '' || Object.values(item).some(val => {
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });

      if (!matchesSearch) return false;

      // Filter logic
      return Object.entries(activeFilters).every(([key, value]) => {
        if (value === undefined || value === '') return true;
        return String(item[key as keyof T]) === String(value);
      });
    });

    // Sorting logic
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === bVal) return 0;
        
        const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * directionMultiplier;
        }
        
        return String(aVal).localeCompare(String(bVal)) * directionMultiplier;
      });
    }

    return result;
  }, [items, searchTerm, activeFilters, sortConfig]);

  const columnFilterOptions = useMemo(() => {
    const options: Record<string, { value: unknown; label: string }[]> = {};
    (columns || []).forEach(col => {
      if (col.filterable) {
        if (col.filterOptions) {
          options[String(col.key)] = col.filterOptions;
        } else {
          const uniqueValues = Array.from(new Set((items || []).map(item => item[col.key])));
          options[String(col.key)] = uniqueValues.map(val => ({
            value: val,
            label: String(val)
          }));
        }
      }
    });
    return options;
  }, [items, columns]);

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
  };

  const hasActiveFilters = searchTerm !== '' || Object.values(activeFilters).some(v => v !== '' && v !== undefined);

  return (
    <div className="bg-white rounded-sm shadow-sm border border-[#EDEBE9] h-full flex flex-col">
      <header className="flex flex-col gap-4 p-4 sm:px-6 border-b border-[#EDEBE9]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[#323130]">{title}</h2>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
              {filteredItems.length} {filteredItems.length !== items.length ? `of ${items.length}` : ''} items
            </span>
            {sortConfig && (
              <button 
                onClick={() => setSortConfig(null)}
                className="text-[10px] text-slate-400 hover:text-[#0078D4] border border-slate-200 px-1.5 py-0.5 rounded uppercase"
              >
                Clear Sort
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-[#EDEBE9] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:border-[#0078D4]"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-sm border ${showFilters ? 'bg-slate-100 border-slate-300 text-[#0078D4]' : 'border-[#EDEBE9] text-slate-600 hover:bg-slate-50'}`}
              title="Toggle Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            {renderHeaderActions && renderHeaderActions()}
            <button
              onClick={handleOpenModal}
              className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#0078D4] rounded-sm hover:bg-[#106EBE] transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New
            </button>
          </div>
        </div>

        {(showFilters || hasActiveFilters) && (
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {(columns || []).filter(c => c.filterable).map(col => (
              <div key={String(col.key)} className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">{col.header}:</label>
                <select
                  value={activeFilters[String(col.key)] || ''}
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, [String(col.key)]: e.target.value }))}
                  className="text-sm border border-[#EDEBE9] rounded-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                >
                  <option value="">All</option>
                  {columnFilterOptions[String(col.key)]?.map(opt => (
                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ))}
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-xs text-[#0078D4] hover:underline font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </header>
      
      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              {(columns || []).map((col) => {
                const isSortable = col.sortable !== false;
                const isSorted = sortConfig?.key === col.key;
                
                return (
                  <th 
                    key={String(col.key)} 
                    scope="col" 
                    className={`px-6 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wider border-b border-[#EDEBE9] bg-white ${isSortable ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
                    onClick={isSortable ? () => handleSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {isSortable && (
                        <div className="text-slate-400">
                          {!isSorted && <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />}
                          {isSorted && sortConfig.direction === 'asc' && <ArrowUp className="w-3 h-3 text-[#0078D4]" />}
                          {isSorted && sortConfig.direction === 'desc' && <ArrowDown className="w-3 h-3 text-[#0078D4]" />}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
              <th scope="col" className="px-6 py-3 border-b border-[#EDEBE9] bg-white">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#EDEBE9]">
            {filteredItems.map((item) => (
              <tr 
                key={item.id} 
                className="hover:bg-[#F3F2F1] transition-colors group cursor-pointer"
                onClick={() => onViewItem ? onViewItem(item) : onEditItem?.(item)}
              >
                {(columns || []).map((col) => (
                  <td key={`${item.id}-${String(col.key)}`} className="px-6 py-3 whitespace-nowrap text-sm text-[#323130]">
                    {col.render ? col.render(item) : (item[col.key] as React.ReactNode)}
                  </td>
                ))}
                <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {customActions && customActions(item)}
                    {onViewItem && (
                      <button 
                        onClick={() => onViewItem(item)} 
                        className="p-1.5 text-[#0078D4] hover:bg-blue-50 rounded-md transition-colors"
                        title="View Details"
                      >
                        <PrinterIcon className="w-4 h-4" />
                      </button>
                    )}
                    {onEditItem && (
                      <button 
                        onClick={() => onEditItem(item)} 
                        className="p-1.5 text-[#0078D4] hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => onDeleteItem(item.id)} 
                      className="p-1.5 text-[#A4262C] hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={(columns || []).length + 1} className="px-6 py-12 text-center text-slate-400 italic">
                  {hasActiveFilters ? 'No items match your filters.' : 'No items found in this list.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`New ${title.slice(0, -1)}`} size={modalSize}>
        <div className="p-1">
          {renderForm(handleCloseModal)}
        </div>
      </Modal>
    </div>
  );
};
