import { Lead } from '@/types/leads';

export const initialLeadsData: Lead[] = [
  { id: '1', name: 'Brez Scales', handle: '@brez.scales', status: 'Won', cash: '$2,500.00', assignedTo: 'Kelvin Zinck', assignedRole: '(C)', account: '@kelvinzinckclips', interacted: '2 mins ago', selected: true },
  { id: '2', name: 'Iman Gadzhi', handle: '@iman.gadzhi', status: 'Unqualified', cash: 'N/A', assignedTo: 'Caleb Bruiners', assignedRole: '(S)', account: '@talkwithkelvin', interacted: '12 mins ago', selected: false },
  { id: '3', name: 'Linda Chen', handle: '@linda.chen', status: 'Booked', cash: 'Pending', assignedTo: 'Caleb Bruiners', assignedRole: '(S)', account: '@kelvinzinckshorts', interacted: '2 days ago', selected: true },
  { id: '4', name: 'David Lee', handle: '@david.lee', messageCount: 3, status: 'New Lead', cash: 'N/A', assignedTo: 'Caleb Bruiners', assignedRole: '(S)', account: '@kelvinzinck', interacted: '5 seconds ago', selected: false },
  { id: '5', name: 'Emily White', handle: '@emily.white', status: 'Qualified', cash: 'N/A', assignedTo: 'Caleb Bruiners', assignedRole: '(S)', account: '@kelvinzinck', interacted: '8 days ago', selected: true },
  { id: '6', name: 'Jessica Wong', handle: '@jessica.wong', status: 'No-Show', cash: 'N/A', assignedTo: 'Caleb Bruiners', assignedRole: '(S)', account: '@kelvinzinck', interacted: '36 days ago', selected: true },
  { id: '7', name: 'Kevin Harris', handle: '@kev.harris', messageCount: 6, status: 'In-Contact', cash: 'Pending', assignedTo: 'Kelvin Zinck', assignedRole: '(C)', account: '@kelvinzinckshorts', interacted: '1 month ago', selected: false },
  { id: '8', name: 'Tom Clark', handle: '@thetomclarksr', status: 'Retarget', cash: 'N/A', assignedTo: 'Caleb Bruiners', assignedRole: '(S)', account: '@kelvinzinckclips', interacted: '17 hours ago', selected: false },
  { id: '9', name: 'Laura Lewis', handle: '@lauratheboss', status: 'New Lead', cash: 'N/A', assignedTo: 'Caleb Bruiners', assignedRole: '(S)', account: '@kelvinzinckclips', interacted: '5 days ago', selected: false },
  { id: '10', name: 'Brian Walker', handle: '@brian.walker', status: 'New Lead', cash: 'N/A', assignedTo: 'Caleb Bruiners', assignedRole: '(S)', account: '@kelvinzinckclips', interacted: '16 minutes ago', selected: true },
];

export const statusStyles: Record<string, string> = {
  'Won': 'bg-green-600 text-white',
  'Unqualified': 'bg-red-600 text-white',
  'Booked': 'bg-[#5b21b6] text-white',
  'New Lead': 'bg-[#f472b6] text-white',
  'Qualified': 'bg-[#fbbf24] text-white',
  'No-Show': 'bg-[#fb7185] text-white',
  'In-Contact': 'bg-[#22c55e] text-white',
  'Retarget': 'bg-[#2563eb] text-white',
};

export const statusTextStyles: Record<string, string> = {
  'New Lead': 'text-[#f472b6]',
  'Qualified': 'text-[#fbbf24]',
  'Booked': 'text-[#5b21b6]',
  'Retarget': 'text-[#2563eb]',
  'Unqualified': 'text-red-600',
  'No-Show': 'text-[#fb7185]',
  'Won': 'text-green-600',
  'In-Contact': 'text-[#22c55e]',
};