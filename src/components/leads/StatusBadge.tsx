import { StatusType } from '@/types/leads';
import { statusStyles } from '@/data/mockLeadsData';

const statusIcons: Record<StatusType, string> = {
  'Won': '/icons/status/Won.svg',
  'Unqualified': '/icons/status/Unqualified.svg',
  'Booked': '/icons/status/Booked.svg',
  'New Lead': '/icons/status/NewLead.svg',
  'Qualified': '/icons/status/Qualified.svg',
  'No-Show': '/icons/status/NoShow.svg',
  'In-Contact': '/icons/status/InContact.svg',
  'Retarget': '/icons/status/Retarget.svg',
};

interface StatusBadgeProps {
  status: StatusType;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const icon = statusIcons[status];
  const style = statusStyles[status];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold w-fit shadow-sm ${style}`}>
      <img src={icon} alt={status + ' icon'} className="w-3 h-3" />
      {status}
    </span>
  );
}