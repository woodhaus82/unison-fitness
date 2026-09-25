import Link from "next/link";
import { addDays, addMonths, format, startOfWeek, parseISO } from "date-fns";
import { WeeklyCalendar } from "./WeeklyCalendar";

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;

  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStart = week ? startOfWeek(parseISO(week), { weekStartsOn: 1 }) : today;
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const thisWeek = format(today, "yyyy-MM-dd");
  const isCurrentWeek = weekStartStr === thisWeek;

  const nav = (label: string, target: Date) => (
    <Link href={`/admin/schedule?week=${format(target, "yyyy-MM-dd")}`} className="underline">
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold">Class programming</h1>
        <p className="mt-1 text-sm text-neutral-500">
          The calendar below is populated automatically from your recurring template — no need to generate weeks by
          hand.
        </p>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
            {isCurrentWeek && <span className="ml-2 text-sm font-normal text-neutral-500">(this week)</span>}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            {nav("← Month", addMonths(weekStart, -1))}
            {nav("← Week", addDays(weekStart, -7))}
            {nav("This week", today)}
            {nav("Week →", addDays(weekStart, 7))}
            {nav("Month →", addMonths(weekStart, 1))}
          </div>
        </div>

        <div className="mt-4">
          <WeeklyCalendar weekStart={weekStart} />
        </div>
      </section>
    </div>
  );
}
