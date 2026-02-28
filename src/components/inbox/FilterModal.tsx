import Image from 'next/image';
import { Inter } from 'next/font/google';
import type { StatusType } from '@/types/inbox';

const inter = Inter({ subsets: ['latin'] });

const statusColors: Record<StatusType, string> = {
  'New Lead': '#F89EE3',
  'In-Contact': '#25D366',
  'Qualified': '#FFC300',
  'Unqualified': '#FF0000',
  'Retarget': '#2C6CD6',
  'Won': '#059700',
  'No-Show': '#FF7847',
  'Booked': '#501884',
};

const statusIconPaths: Record<StatusType, string> = {
  'New Lead': '/icons/status/NewLead.svg',
  'In-Contact': '/icons/status/InContact.svg',
  'Qualified': '/icons/status/Qualified.svg',
  'Unqualified': '/icons/status/Unqualified.svg',
  'Retarget': '/icons/status/Retarget.svg',
  'Won': '/icons/status/Won.svg',
  'No-Show': '/icons/status/NoShow.svg',
  'Booked': '/icons/status/Booked.svg',
};

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function StatusFilter({ statuses, selected, onChange }: {
  statuses: StatusType[];
  selected: StatusType[];
  onChange: (status: StatusType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1">
      {statuses.map((status) => {
        const isActive = selected.includes(status);
        const color = statusColors[status];
        return (
          <button
            key={status}
            onClick={() => onChange(status)}
            className={`flex items-center gap-2 px-2 py-1 rounded-md border border-transparent hover:border-[#F0F2F6] cursor-pointer group ${isActive ? 'bg-white border-[#F0F2F6]' : ''}`}
          >
            <div className={`w-[13px] h-[13px] rounded-[3px] border ${isActive ? 'bg-[#8771FF] border-[#8771FF]' : 'bg-white border-[#F0F2F6]'} flex items-center justify-center`}>
              {isActive && <div className="w-1.5 h-1 border-l-2 border-b-2 border-white -rotate-45 mb-0.5" />}
            </div>
            <div
              className="flex items-center justify-center rounded-[3px] shrink-0"
              style={{ width: 18, height: 18, background: color }}
            >
              <Image src={statusIconPaths[status]} alt="" width={12} height={12} />
            </div>
            <span className="text-[14px] font-medium" style={{ color: color }}>
              {status}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function FilterModal({
  show,
  onClose,
  selectedStatuses,
  setSelectedStatuses,
  statusOptions,
  accountOptions,
  selectedAccountIds,
  setSelectedAccountIds,
}: {
  show: boolean;
  onClose: () => void;
  selectedStatuses: StatusType[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<StatusType[]>>;
  statusOptions: StatusType[];
  accountOptions: Array<{ id: string; label: string }>;
  selectedAccountIds: string[];
  setSelectedAccountIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  if (!show) return null;
  return (
    <div className={`${inter.className} fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 antialiased`}>
      <div className="w-[420px] bg-white rounded-[18px] border border-[#F0F2F6] shadow-sm font-sans flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 text-[15px] font-medium text-[#2B2B2C]">Filters</div>
        {/* Funnel Stage Section */}
        <div className="px-2 space-y-1">
          <div className="px-2 py-1 text-[14px] font-medium text-[#2B2B2C]">Funnel Stage</div>
          <StatusFilter
            statuses={statusOptions}
            selected={selectedStatuses}
            onChange={status =>
              setSelectedStatuses(prev =>
                prev.includes(status)
                  ? prev.filter(s => s !== status)
                  : [...prev, status]
              )
            }
          />
        </div>
        {/* Select Inputs */}
        <div className="p-2 space-y-3">
          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#2B2B2C] px-1">Assigned to</label>
            <div className="w-full h-[32px] px-2 flex items-center justify-between bg-white border border-[#F0F2F6] rounded-md cursor-pointer">
              <span className="flex items-center gap-2 text-[12px] text-[#2B2B2C]">
                <Image src="/all-team.svg" alt="All team" width={16} height={16} />
                All team members
              </span>
              <ChevronDownIcon className="w-4 h-4 text-[#9A9CA2]" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[14px] font-medium text-[#2B2B2C] px-1">Accounts</label>
            <div className="w-full max-h-[140px] overflow-y-auto px-2 py-2 bg-white border border-[#F0F2F6] rounded-md space-y-1">
              {accountOptions.length === 0 && (
                <span className="flex items-center gap-2 text-[12px] text-[#9CA3AF] px-1 py-1">
                  <Image src="/all-accounts.svg" alt="All accounts" width={16} height={16} />
                  No connected accounts
                </span>
              )}
              {accountOptions.map((account) => {
                const checked = selectedAccountIds.includes(account.id);
                return (
                  <button
                    key={account.id}
                    onClick={() =>
                      setSelectedAccountIds((prev) =>
                        prev.includes(account.id)
                          ? prev.filter((id) => id !== account.id)
                          : [...prev, account.id]
                      )
                    }
                    className="w-full flex items-center gap-2 text-left text-[12px] text-[#2B2B2C] px-1 py-1 rounded hover:bg-[#F8F8FA]"
                  >
                    <div className={`w-[13px] h-[13px] rounded-[3px] border ${checked ? 'bg-[#8771FF] border-[#8771FF]' : 'bg-white border-[#F0F2F6]'} flex items-center justify-center`}>
                      {checked && <div className="w-1.5 h-1 border-l-2 border-b-2 border-white -rotate-45 mb-0.5" />}
                    </div>
                    <span className="truncate">{account.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* Footer Buttons */}
        <div className="p-3 mt-2 flex justify-between items-center border-t border-[#F0F2F6]">
          <button
            onClick={() => {
              setSelectedStatuses([]);
              setSelectedAccountIds([]);
              onClose();
            }}
            className="px-3 py-1 text-[12px] font-medium text-[#8771FF] hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-[12px] font-medium text-white bg-[#8771FF] rounded-lg shadow-sm hover:opacity-90 transition-opacity"
          >
            Show result
          </button>
        </div>
      </div>
    </div>
  );
}

