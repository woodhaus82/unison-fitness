import Link from "next/link";
import { addDays, format, startOfWeek, parseISO } from "date-fns";
import { ScheduleUploader } from "./ScheduleUploader";
import { GenerateWeekButton } from "./GenerateWeekButton";
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
  const prevWeek = format(addDays(weekStart, -7), "yyyy-MM-dd");
  const nextWeek = format(addDays(weekStart, 7), "yyyy-MM-dd");
  const thisWeek = format(today, "yyyy-MM-dd");
  const isCurrentWeek = weekStartStr === thisWeek;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold">Class programming</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Generate a week from your recurring template, or import/override it from a spreadsheet.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Import schedule</h2>
        <div className="mt-4">
          <ScheduleUploader />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
            {isCurrentWeek && <span className="ml-2 text-sm font-normal text-neutral-500">(this week)</span>}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <Link href={`/admin/schedule?week=${prevWeek}`} className="underline">
              ← Previous week
            </Link>
            <Link href={`/admin/schedule?week=${thisWeek}`} className="underline">
              This week
            </Link>
            <Link href={`/admin/schedule?week=${nextWeek}`} className="underline">
              Next week →
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <GenerateWeekButton
            weekStart={weekStartStr}
            label={isCurrentWeek ? "Generate this week from recurring template" : "Generate this week"}
          />
        </div>

        <div className="mt-4">
          <WeeklyCalendar weekStart={weekStart} />
        </div>
      </section>
    </div>
  );
}
