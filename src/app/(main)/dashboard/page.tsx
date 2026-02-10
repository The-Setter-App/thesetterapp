import { 
  Search, 
  Bell, 
  DollarSign, 
  Hourglass, 
  Percent, 
  ArrowUpRight,
  ChevronDown
} from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';
import FunnelChart from '@/components/dashboard/FunnelChart';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <div className="pt-4 max-w-[1400px] mx-auto space-y-10">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hi, Kelvin!</h1>
            <p className="text-gray-500 text-sm mt-1">Your Setter Dashboard</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute top-0 right-0.5 w-2 h-2 bg-purple-600 rounded-full border-2 border-white"></div>
              <Bell className="text-purple-400 hover:text-purple-600 cursor-pointer" size={24} />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text" 
                placeholder="Search" 
                className="pl-10 pr-4 py-2 border border-gray-100 bg-gray-50 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-all w-64 placeholder-gray-400"
              />
            </div>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-4 justify-between items-center">
          {/* Segmented Control */}
          <div className="bg-[#F8F9FA] p-1 rounded-lg flex gap-1">
            <button className="px-5 py-1.5 text-sm font-semibold rounded-md bg-[#EDEEF1] text-gray-900 shadow-sm transition-all">
              12 months
            </button>
            {['30 days', '7 days', '24 hours', '60 minutes'].map((range) => (
              <button 
                key={range}
                className="px-5 py-1.5 text-sm font-medium rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                {range}
              </button>
            ))}
          </div>
          
          <button className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
            All Accounts <ChevronDown size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <MetricCard 
            value="$106,673" 
            label="Total revenue" 
            icon={<DollarSign size={20} />} 
          />
          <MetricCard 
            value="2.3 min" 
            label="Avg reply time" 
            icon={<Hourglass size={20} />} 
          />
          <MetricCard 
            value="$978.09" 
            label="Revenue per call" 
            icon={<DollarSign size={20} />} 
          />
          <MetricCard 
            value="82%" 
            label="Conversation rate" 
            icon={<Percent size={20} />} 
          />
          <MetricCard 
            value="97%" 
            label="Avg reply rate" 
            icon={<ArrowUpRight size={20} />} 
          />
        </div>

        {/* Funnel Chart Section */}
        <FunnelChart />
        
      </div>
    </div>
  );
}