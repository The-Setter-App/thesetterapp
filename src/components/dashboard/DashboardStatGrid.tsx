import { LuClock3, LuMessagesSquare, LuReply, LuWallet } from "react-icons/lu";
import {
  formatCurrency,
  formatRate,
  formatReplyTime,
} from "@/lib/dashboard/format";
import type { DashboardMetricSnapshot } from "@/types/dashboard";
import StatTile from "./StatTile";

interface DashboardStatGridProps {
  metrics: DashboardMetricSnapshot;
}

export default function DashboardStatGrid({ metrics }: DashboardStatGridProps) {
  return (
    <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2">
      <StatTile
        order={2}
        icon={LuClock3}
        label="Avg reply time"
        value={formatReplyTime(metrics.avgReplyTimeMs)}
        caption="Lead message to your reply."
      />
      <StatTile
        order={3}
        icon={LuWallet}
        label="Revenue per call"
        value={formatCurrency(metrics.revenuePerCall)}
        caption="Per lead with a payment."
      />
      <StatTile
        order={4}
        icon={LuMessagesSquare}
        label="Conversation rate"
        value={`${metrics.conversationRate}%`}
        caption="Reached qualified or beyond."
      />
      <StatTile
        order={5}
        icon={LuReply}
        label="Avg reply rate"
        value={formatRate(metrics.avgReplyRate)}
        caption="Inbound chats you answered."
      />
    </div>
  );
}
