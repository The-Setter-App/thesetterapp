"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Trash2,
  CloudDownload,
  ChevronDown,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Lead, StatusType, SortConfig } from '@/types/leads';
import { initialLeadsData, statusTextStyles } from '@/data/mockLeadsData';
import CustomCheckbox from '@/components/leads/CustomCheckbox';
import StatusBadge from '@/components/leads/StatusBadge';
import Image from 'next/image';

const statusColorIcons: Record<StatusType, string> = {
  'Won': '/icons/status-colors/Won.svg',
  'Unqualified': '/icons/status-colors/Unqualified.svg',
  'Booked': '/icons/status-colors/Booked.svg',
  'New Lead': '/icons/status-colors/NewLead.svg',
  'Qualified': '/icons/status-colors/Qualified.svg',
  'No-Show': '/icons/status-colors/NoShow.svg',
  'In-Contact': '/icons/status-colors/InContact.svg',
  'Retarget': '/icons/status-colors/Retarget.svg',
};

const allStatuses: StatusType[] = [
  'New Lead', 'Qualified', 'Booked', 'Retarget', 'Unqualified', 'No-Show', 'Won', 'In-Contact'
];

const ArrowDownIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
  </svg>
);

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('leads-checkbox-state');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return initialLeadsData;
        }
      }
    }
    return initialLeadsData;
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('leads-checkbox-state', JSON.stringify(leads));
    }
  }, [leads]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCheckboxChange = (id: string) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === id ? { ...lead, selected: !lead.selected } : lead
      )
    );
  };

  const handleToggleAll = () => {
    const allSelected = leads.every((lead) => lead.selected);
    setLeads((prevLeads) =>
      prevLeads.map((lead) => ({ ...lead, selected: !allSelected }))
    );
  };

  const toggleStatusFilter = (status: StatusType) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const handleSort = (key: keyof Lead) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    if (selectedStatuses.length > 0) {
      result = result.filter(lead => selectedStatuses.includes(lead.status));
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue === undefined) aValue = '';
        if (bValue === undefined) bValue = '';

        if (sortConfig.key === 'cash') {
          const parseCash = (val: string | number | undefined) => {
              const strVal = String(val);
              if (strVal === 'N/A' || strVal === 'Pending') return -1;
              return parseFloat(strVal.replace(/[^0-9.-]+/g,""));
          }
          
          const aNum = parseCash(aValue as string);
          const bNum = parseCash(bValue as string);
          
          if (aNum < bNum) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aNum > bNum) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }

        if (String(aValue).toLowerCase() < String(bValue).toLowerCase()) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (String(aValue).toLowerCase() > String(bValue).toLowerCase()) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return result;
  }, [leads, sortConfig, selectedStatuses]);

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

  let headerCheckboxState: boolean | 'indeterminate' = false;
  if (leads.length > 0) {
    const selectedCount = leads.filter(l => l.selected).length;
    if (selectedCount === leads.length) headerCheckboxState = true;
    else if (selectedCount === 0) headerCheckboxState = false;
    else headerCheckboxState = 'indeterminate';
  }

  const getStatusCount = (status: StatusType) => leads.filter(l => l.status === status).length;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <div className="pt-4 md:pt-6 pl-6 space-y-6">
        
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 ml-10">
              <h1 className="text-xl font-bold text-gray-900">Leads</h1>
              <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{filteredAndSortedLeads.length}</span>
            </div>
            <p className="text-gray-500 text-xs mt-1 ml-10">
              One calendar showing all calls, outcomes, and revenue across your team.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end mr-10">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-2 py-2 text-sm font-medium">
              <Trash2 size={18} /> Delete
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <CloudDownload size={18} /> Export
            </button>

            <div className="relative flex-grow md:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search" 
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 w-full md:w-64"
              />
            </div>
          </div>
        </div>

        {/* Filters & Pagination Row */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 px-10">
          <div className="flex items-center gap-2 w-full overflow-visible pb-2 lg:pb-0 relative z-10">
            <button className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 border border-gray-200 rounded-lg bg-white text-xs font-medium text-gray-900 hover:bg-gray-50 whitespace-nowrap shadow-sm">
              <img src="/icons/headers/Calendar.svg" alt="Calendar" className="w-3 h-3 text-gray-500" />
              Last 7 days <ChevronDown size={14} className="text-gray-500" />
            </button>
            <button className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 border border-gray-200 rounded-lg bg-white text-xs font-medium text-gray-900 hover:bg-gray-50 whitespace-nowrap shadow-sm">
              <img src="/icons/headers/User.svg" alt="User" className="w-3 h-3 text-gray-500" />
              All Accounts <ChevronDown size={14} className="text-gray-500" />
            </button>
            
            <div className="relative" ref={statusDropdownRef}>
              <button 
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 border rounded-lg text-xs font-medium whitespace-nowrap shadow-sm transition-colors
                  ${showStatusDropdown || selectedStatuses.length > 0 
                    ? 'bg-white border-[#8B5CF6] ring-1 ring-[#8B5CF6]' 
                    : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'}`}
              >
                <img src="/icons/headers/Updates.svg" alt="Updates" className={`w-4 h-4 ${showStatusDropdown || selectedStatuses.length > 0 ? 'text-[#8B5CF6]' : 'text-gray-500'}`} />
                {selectedStatuses.length > 0 ? `${selectedStatuses.length} Statuses` : 'Any Status'} 
                <ChevronDown size={14} className={`${showStatusDropdown || selectedStatuses.length > 0 ? 'text-[#8B5CF6]' : 'text-gray-500'} transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2 overflow-hidden">
                  <div className="space-y-1">
                    {allStatuses.map((status) => {
                      const isSelected = selectedStatuses.includes(status);
                      const Icon = statusColorIcons[status];
                      return (
                        <div 
                          key={status}
                          onClick={() => toggleStatusFilter(status)}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <img src={Icon} alt="" className="w-4 h-4 opacity-90" />
                            <span className={`text-sm font-medium ${statusTextStyles[status]}`}>
                              {status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="text-xs text-gray-400 font-medium">
                                {getStatusCount(status)}
                             </span>
                             <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors
                               ${isSelected 
                                 ? 'border-[#8B5CF6] bg-[#8B5CF6]' 
                                 : 'border-gray-300 group-hover:border-gray-400'}`}
                             >
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                )}
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 border border-gray-200 rounded-lg bg-white text-xs font-medium text-gray-900 hover:bg-gray-50 whitespace-nowrap shadow-sm">
              <img src="/icons/headers/Coin.svg" alt="Coin" className="w-3 h-3 text-gray-500" />
              All Payments <ChevronDown size={14} className="text-gray-500" />
            </button>
            <button className="flex-shrink-0 pt-1 pb-1 pl-2 pr-2 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50 shadow-sm flex items-center justify-center">
              <img src="/icons/headers/Funnel.svg" alt="Funnel" className="w-3 h-4" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 w-full lg:w-auto justify-end">
            <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap">
              <span className="inline-flex items-center whitespace-nowrap">Rows per page</span> <ChevronDown size={14} />
            </button>

            <div className="flex items-center gap-1.5 ml-2">
              <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                <ChevronLeft size={16} />
              </button>
              
              <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-sm font-medium text-gray-900 bg-gray-50">1</button>
              <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">2</button>
              <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">3</button>
              <span className="text-gray-400 px-1">...</span>
              <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">28</button>
              
              <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="block md:hidden space-y-3">
          {filteredAndSortedLeads.map((lead) => (
            <div key={lead.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <CustomCheckbox 
                      checked={!!lead.selected} 
                      onChange={() => handleCheckboxChange(lead.id)} 
                    />
                    
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.name}`} alt={lead.name} className="w-full h-full object-cover"/>
                    </div>
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
        <div className="hidden md:block border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[13px] font-semibold text-gray-500 tracking-wider">
                  <th className="px-4 py-3 w-10 min-w-[40px] max-w-[40px] text-center">
                    <div className="flex items-center justify-center">
                      <CustomCheckbox 
                        checked={headerCheckboxState}
                        onChange={handleToggleAll} 
                      />
                    </div>
                  </th>
                  <th onClick={() => handleSort('name')} className="px-4 py-3 min-w-[180px] max-w-[220px] cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                    <div className="flex items-center gap-1 select-none">
                      Lead Name {renderSortIcon('name')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('handle')} className="px-4 py-3 min-w-[120px] max-w-[160px] cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                    <div className="flex items-center gap-1 select-none">
                      Username {renderSortIcon('handle')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('status')} className="px-4 py-3 min-w-[120px] max-w-[140px] cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                    <div className="flex items-center gap-1 select-none">
                      Status {renderSortIcon('status')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('cash')} className="px-4 py-3 min-w-[120px] max-w-[140px] cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                    <div className="flex items-center gap-1 select-none">
                      Cash Collected {renderSortIcon('cash')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('assignedTo')} className="px-4 py-3 min-w-[160px] max-w-[200px] cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                    <div className="flex items-center gap-1 select-none">
                      Assigned To {renderSortIcon('assignedTo')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('account')} className="px-4 py-3 min-w-[140px] max-w-[180px] cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                    <div className="flex items-center gap-1 select-none">
                      Account {renderSortIcon('account')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('interacted')} className="px-4 py-3 min-w-[120px] max-w-[160px] cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap">
                    <div className="flex items-center gap-1 select-none">
                      Interacted {renderSortIcon('interacted')}
                    </div>
                  </th>
                  <th className="px-4 py-3 w-10 min-w-[40px] max-w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredAndSortedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <CustomCheckbox 
                          checked={!!lead.selected} 
                          onChange={() => handleCheckboxChange(lead.id)} 
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.name}`} alt={lead.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{lead.name}</span>
                              {lead.messageCount && (
                                <span className="flex items-center justify-center bg-[#8B5CF6] text-white text-[10px] font-bold px-1.5 h-4 rounded-full">
                                  <img src="/icons/MessageCount.svg" alt="msg" className="mr-0.5 w-3 h-3" /> {lead.messageCount}
                                </span>
                              )}
                            </div>
                          </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.handle || <span className='italic text-gray-400'>N/A</span>}</td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.cash}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.assignedTo}`} alt={lead.assignedTo} />
                        </div>
                        <span className="text-sm text-gray-700">{lead.assignedTo} <span className="text-gray-400">{lead.assignedRole}</span></span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{lead.account}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{lead.interacted}</td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}