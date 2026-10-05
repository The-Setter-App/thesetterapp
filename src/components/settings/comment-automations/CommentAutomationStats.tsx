import type {
  CommentAutomationVariant,
  VariantConversionStats,
} from "@/lib/commentAutomationsRepository";

interface CommentAutomationStatsProps {
  variants: CommentAutomationVariant[];
  stats: VariantConversionStats[];
}

const HEAD_CELL_CLASS =
  "pb-2 pr-4 text-left text-xs font-medium text-[#9A9CA2] last:pr-0";
const BODY_CELL_CLASS =
  "py-2.5 pr-4 text-sm tabular-nums text-[#606266] last:pr-0";

function formatRate(count: number, sent: number): string {
  if (sent === 0) return String(count);
  return `${count} (${Math.round((count / sent) * 100)}%)`;
}

interface StatsRowProps {
  label: string;
  stats: VariantConversionStats | undefined;
}

function StatsRow({ label, stats }: StatsRowProps) {
  const sent = stats?.sent ?? 0;

  return (
    <tr className="border-t border-[#ECE8FF]">
      <td className={`${BODY_CELL_CLASS} font-medium !text-[#101011]`}>
        {label}
      </td>
      <td className={BODY_CELL_CLASS}>{sent}</td>
      <td className={BODY_CELL_CLASS}>
        {formatRate(stats?.replied ?? 0, sent)}
      </td>
      <td className={BODY_CELL_CLASS}>
        {formatRate(stats?.qualified ?? 0, sent)}
      </td>
      <td className={BODY_CELL_CLASS}>
        {formatRate(stats?.booked ?? 0, sent)}
      </td>
    </tr>
  );
}

// How far the people who received each message went: replied, qualified,
// booked. Without variants there is a single row for the main message.
export default function CommentAutomationStats({
  variants,
  stats,
}: CommentAutomationStatsProps) {
  const statsByVariant = new Map(stats.map((row) => [row.variantId, row]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[26rem]">
        <thead>
          <tr>
            <th scope="col" className={HEAD_CELL_CLASS}>
              Message
            </th>
            <th scope="col" className={HEAD_CELL_CLASS}>
              Sent
            </th>
            <th scope="col" className={HEAD_CELL_CLASS}>
              Replied
            </th>
            <th scope="col" className={HEAD_CELL_CLASS}>
              Qualified
            </th>
            <th scope="col" className={HEAD_CELL_CLASS}>
              Booked
            </th>
          </tr>
        </thead>
        <tbody>
          {variants.length === 0 ? (
            <StatsRow label="Main message" stats={statsByVariant.get(null)} />
          ) : (
            variants.map((variant, index) => (
              <StatsRow
                key={variant.id}
                label={`Variant ${index + 1}`}
                stats={statsByVariant.get(variant.id)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
