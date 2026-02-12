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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <div className="pt-8 max-w-[1400px] mx-auto space-y-10 px-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hi, Kelvin!</h1>
            <p className="text-gray-500 mt-1">Your Setter Dashboard overview.</p>
          </div>
          
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="relative cursor-pointer">
              <div className="absolute top-0 right-0.5 w-2.5 h-2.5 bg-[#8771FF] rounded-full border-2 border-white"></div>
              <Bell className="text-gray-400 hover:text-[#8771FF] transition-colors" size={24} />
            </div>

            <div className="w-full md:w-80">
              <Input 
                icon={<Search size={18} />} 
                placeholder="Search analytics..." 
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-4 justify-between items-center">
          {/* Segmented Control */}
          <div className="bg-gray-100 p-1.5 rounded-xl flex gap-1">
            <button className="px-6 py-2 text-sm font-semibold rounded-lg bg-white text-gray-900 shadow-sm transition-all">
              12 months
            </button>
            {['30 days', '7 days', '24 hours', '60 minutes'].map((range) => (
              <button 
                key={range}
                className="px-6 py-2 text-sm font-medium rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 transition-all"
              >
                {range}
              </button>
            ))}
          </div>
          
          <Button variant="outline" rightIcon={<ChevronDown size={16} />} className="bg-white">
            All Accounts
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <MetricCard 
            value="$106,673" 
            label="Total revenue" 
            icon={<DollarSign size={24} />} 
          />
          <MetricCard 
            value="2.3 min" 
            label="Avg reply time" 
            icon={<Hourglass size={24} />} 
          />
          <MetricCard 
            value="$978.09" 
            label="Revenue per call" 
            icon={<DollarSign size={24} />} 
          />
          <MetricCard 
            value="82%" 
            label="Conversation rate" 
            icon={<Percent size={24} />} 
          />
          <MetricCard 
            value="97%" 
            label="Avg reply rate" 
            icon={<ArrowUpRight size={24} />} 
          />
        </div>

        {/* Funnel Chart Section */}
        <FunnelChart />
        
      </div>
    </div>
  );
}