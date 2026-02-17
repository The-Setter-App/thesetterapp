import React, { useRef, useEffect } from 'react';
import { Search, Trash2, CloudDownload, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { STATUS_COLOR_ICON_PATHS, STATUS_OPTIONS, STATUS_TEXT_CLASS_MAP } from '@/lib/status/config';
import type { StatusType } from '@/types/status';

interface LeadsFiltersProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: StatusType[];
  onToggleStatus: (status: StatusType) => void;
  getStatusCount: (status: StatusType) => number;
}

const allStatuses: StatusType[] = STATUS_OPTIONS;

export default function LeadsFilters({
  totalCount,
  search,
  onSearchChange,
  selectedStatuses,
  onToggleStatus,
  getStatusCount,
}: LeadsFiltersProps) {
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 ml-4 md:ml-10">
            <h1 className="text-xl font-bold text-gray-900">Leads</h1>
            <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1 ml-4 md:ml-10">
            One calendar showing all calls, outcomes, and revenue across your team.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end md:mr-10 px-4 md:px-0">
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900" leftIcon={<Trash2 size={18} />}>
            Delete
          </Button>
          
          <Button variant="outline" size="sm" className="text-gray-700" leftIcon={<CloudDownload size={18} />}>
            Export
          </Button>

          <div className="w-full md:w-64">
            <Input
              placeholder="Search"
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 px-4 md:px-10">
        <div className="flex flex-wrap items-center gap-2 w-full">
          <Button variant="outline" size="sm" className="h-8 text-xs bg-white font-medium text-gray-900 px-3">
             <img src="/icons/headers/Calendar.svg" alt="Calendar" className="w-3 h-3 text-gray-500 mr-2" />
             Last 7 days <ChevronDown size={14} className="ml-1 text-gray-500" />
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs bg-white font-medium text-gray-900 px-3">
             <img src="/icons/headers/User.svg" alt="User" className="w-3 h-3 text-gray-500 mr-2" />
             All Accounts <ChevronDown size={14} className="ml-1 text-gray-500" />
          </Button>
          
          <div className="relative" ref={statusDropdownRef}>
            <button 
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-medium whitespace-nowrap shadow-sm transition-all h-8
                ${showStatusDropdown || selectedStatuses.length > 0 
                  ? 'bg-white border-[#8B5CF6] ring-1 ring-[#8B5CF6] text-gray-900' 
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
                    const Icon = STATUS_COLOR_ICON_PATHS[status];
                    return (
                      <div 
                        key={status}
                        onClick={() => onToggleStatus(status)}
                        className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img src={Icon} alt="" className="w-4 h-4 opacity-90" />
                          <span className={`text-sm font-medium ${STATUS_TEXT_CLASS_MAP[status]}`}>
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

          <Button variant="outline" size="sm" className="h-8 text-xs bg-white font-medium text-gray-900 px-3">
             <img src="/icons/headers/Coin.svg" alt="Coin" className="w-3 h-3 text-gray-500 mr-2" />
             All Payments <ChevronDown size={14} className="ml-1 text-gray-500" />
          </Button>

          <button className="h-8 w-8 border border-gray-200 rounded-xl bg-white text-gray-500 hover:bg-gray-50 shadow-sm flex items-center justify-center">
            <img src="/icons/headers/Funnel.svg" alt="Funnel" className="w-3 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
