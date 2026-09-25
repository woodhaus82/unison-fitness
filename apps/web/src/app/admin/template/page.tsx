import { AddClassTypeForm } from "./AddClassTypeForm";
import { ClassTypeList } from "./ClassTypeList";
import { ClassGrid } from "./ClassGrid";

export default async function TemplatePage() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold">Recurring weekly template</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tick which class types run in each time slot. This is the pattern &quot;Generate this week&quot; (on the
          Schedule page) stamps out into real, bookable sessions — editing it doesn&apos;t change sessions already
          generated, only future ones.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Class types</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Click a name, capacity or colour to edit it. Capacity changes only apply to sessions generated after the
          change — sessions already on the schedule keep the capacity they were created with.
        </p>
        <div className="mt-4">
          <ClassTypeList />
        </div>
        <div className="mt-4">
          <AddClassTypeForm />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Weekly grid</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Click a time to edit it. &quot;+ Add time&quot; adds another slot to that day.
        </p>
        <div className="mt-4">
          <ClassGrid />
        </div>
      </section>
    </div>
  );
}
