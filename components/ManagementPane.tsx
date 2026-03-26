import React, { useState } from 'react';
import { PlusIcon, TrashIcon, EditIcon, PrinterIcon } from './icons';
import { Modal } from './Modal';

interface ManagementPaneProps<T> {
  title: string;
  items: T[];
  columns: { key: keyof T; header: string; render?: (item: T) => React.ReactNode }[];
  onDeleteItem: (id: string) => void;
  onEditItem?: (item: T) => void;
  onViewItem?: (item: T) => void;
  renderForm: (onClose: () => void) => React.ReactNode;
}

export const ManagementPane = <T extends { id: string }>({
  title,
  items,
  columns,
  onDeleteItem,
  onEditItem,
  onViewItem,
  renderForm,
}: ManagementPaneProps<T>) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-sm shadow-sm border border-[#EDEBE9] h-full flex flex-col">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:px-6 border-b border-[#EDEBE9]">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[#323130]">{title}</h2>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
            {items.length} items
          </span>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#0078D4] rounded-sm hover:bg-[#106EBE] transition-colors shadow-sm"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          New
        </button>
      </header>
      
      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th 
                  key={String(col.key)} 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wider border-b border-[#EDEBE9] bg-white"
                >
                  {col.header}
                </th>
              ))}
              <th scope="col" className="px-6 py-3 border-b border-[#EDEBE9] bg-white">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#EDEBE9]">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-[#F3F2F1] transition-colors group">
                {columns.map((col) => (
                  <td key={`${item.id}-${String(col.key)}`} className="px-6 py-3 whitespace-nowrap text-sm text-[#323130]">
                    {col.render ? col.render(item) : (item[col.key] as React.ReactNode)}
                  </td>
                ))}
                <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
            {items.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-400 italic">
                  No items found in this list.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`New ${title.slice(0, -1)}`}>
        <div className="p-1">
          {renderForm(handleCloseModal)}
        </div>
      </Modal>
    </div>
  );
};
