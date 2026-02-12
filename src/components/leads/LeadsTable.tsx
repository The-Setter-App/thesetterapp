import React from 'react';
import { MoreVertical, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Lead, SortConfig } from '@/types/leads';
import CustomCheckbox from '@/components/leads/CustomCheckbox';
import StatusBadge from '@/components/leads/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

interface LeadsTableProps {
  leads: Lead[];
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  headerCheckboxState: boolean | 'indeterminate';
  sortConfig: SortConfig;
  onSort: (key: keyof Lead) => void;
}

const ArrowDownIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
  </svg>
);

export default function LeadsTable({
  leads,
  onToggleSelect,
  onToggleAll,
  headerCheckboxState,
  sortConfig,
  onSort,
}: LeadsTableProps) {

  const renderSortIcon = (columnKey: keyof Lead) => {
    const isActive = sortConfig?.key === columnKey;
    const isAsc = sortConfig?.direction === 'asc';

    return (
      <ArrowDownIcon 
        style={{ 
          width: 16, 
          height: 16, 
          marginLeft: 2,
          opacity: isActive ? 1 : 0.3,
          transform: isActive && isAsc ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s, opacity 0.2s'
        }} 
      />
    );
  };

  return (
    <>
      {/* MOBILE VIEW: Cards */}
      <div className="block md:hidden space-y-3 px-4">
        {leads.map((lead) => (
          <div key={lead.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <CustomCheckbox 
                    checked={!!lead.selected} 
                    onChange={() => onToggleSelect(lead.id)} 
                  />
                  
                  <Avatar 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.name}`} 
                    alt={lead.name}
                    size="sm"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{lead.name}</h3>
                    <p className="text-xs text-gray-500">{lead.handle}</p>
                  </div>
                </div>
                <button className="text-gray-400"><MoreVertical size={16} /></button>
            </div>
            <div className="pl-7 flex flex-col gap-1">
              <StatusBadge status={lead.status} />
              <div className="text-xs text-gray-700"><span className="font-semibold text-gray-400 mr-1">Username:</span>{lead.handle}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-1 pl-7">
              <div className="text-gray-500"><span className="block text-[10px] uppercase font-semibold text-gray-400">Cash</span>{lead.cash}</div>
              <div className="text-gray-500"><span className="block text-[10px] uppercase font-semibold text-gray-400">Interacted</span>{lead.interacted}</div>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP VIEW: Table */}
      <div className="hidden md:block border border-gray-100 overflow-hidden shadow-sm rounded-2xl mx-10 mb-10">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[13px] font-semibold text-gray-500 tracking-wider h-12">
                <th className="px-6 py-3 w-12 text-center">
                  <div className="flex items-center justify-center">
                    <CustomCheckbox 
                      checked={headerCheckboxState}
                      onChange={onToggleAll} 
                    />
                  </div>
                </th>
                <th onClick={() => onSort('name')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                  <div className="flex items-center gap-1 select-none">
                    Lead Name {renderSortIcon('name')}
                  </div>
                </th>
                <th onClick={() => onSort('handle')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                  <div className="flex items-center gap-1 select-none">
                    Username {renderSortIcon('handle')}
                  </div>
                </th>
                <th onClick={() => onSort('status')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                  <div className="flex items-center gap-1 select-none">
                    Status {renderSortIcon('status')}
                  </div>
                </th>
                <th onClick={() => onSort('cash')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                  <div className="flex items-center gap-1 select-none">
                    Cash Collected {renderSortIcon('cash')}
                  </div>
                </th>
                <th onClick={() => onSort('assignedTo')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                  <div className="flex items-center gap-1 select-none">
                    Assigned To {renderSortIcon('assignedTo')}
                  </div>
                </th>
                <th onClick={() => onSort('account')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                  <div className="flex items-center gap-1 select-none">
                    Account {renderSortIcon('account')}
                  </div>
                </th>
                <th onClick={() => onSort('interacted')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                  <div className="flex items-center gap-1 select-none">
                    Interacted {renderSortIcon('interacted')}
                  </div>
                </th>
                <th className="px-6 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors group h-16">
                  <td className="px-6 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <CustomCheckbox 
                        checked={!!lead.selected} 
                        onChange={() => onToggleSelect(lead.id)} 
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                        <Avatar 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.name}`} 
                          alt={lead.name}
                          size="sm"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{lead.name}</span>
                            {lead.messageCount && (
                              <span className="flex items-center justify-center bg-[#8B5CF6] text-white text-[10px] font-bold px-1.5 h-4 rounded-full">
                                <img src="/icons/MessageCount.svg" alt="msg" className="mr-0.5 w-3 h-3" /> {lead.messageCount}
                              </span>
                            )}
                          </div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 font-medium">{lead.handle || <span className='italic text-gray-400'>N/A</span>}</td>
                  <td className="px-6 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-6 py-3 text-sm text-gray-600 font-medium">{lead.cash}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.assignedTo}`} 
                        alt={lead.assignedTo}
                        size="xs"
                        className="w-6 h-6"
                      />
                      <span className="text-sm text-gray-700 font-medium">{lead.assignedTo} <span className="text-gray-400 font-normal">{lead.assignedRole}</span></span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{lead.account}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{lead.interacted}</td>
                  <td className="px-6 py-3 text-center">
                    <button className="text-gray-300 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Footer (Moved inside table container or separate?) */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
             <div className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-900">{leads.length}</span> results
             </div>
             <div className="flex items-center gap-1.5">
                <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl text-gray-500 hover:bg-white hover:shadow-sm transition-all disabled:opacity-50">
                  <ChevronLeft size={16} />
                </button>
                
                <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 bg-white shadow-sm">1</button>
                <button className="w-9 h-9 flex items-center justify-center border border-transparent rounded-xl text-sm font-medium text-gray-600 hover:bg-white/50">2</button>
                <button className="w-9 h-9 flex items-center justify-center border border-transparent rounded-xl text-sm font-medium text-gray-600 hover:bg-white/50">3</button>
                <span className="text-gray-400 px-1">...</span>
                <button className="w-9 h-9 flex items-center justify-center border border-transparent rounded-xl text-sm font-medium text-gray-600 hover:bg-white/50">28</button>
                
                <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl text-gray-500 hover:bg-white hover:shadow-sm transition-all">
                  <ChevronRight size={16} />
                </button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}