import { createClient } from "@/lib/supabase/server";
import { ClassTypeRow } from "./ClassTypeRow";

export async function ClassTypeList() {
  const supabase = await createClient();
  const { data: classTypes } = await supabase
    .from("class_types")
    .select("id, name, default_capacity, color")
    .order("name");

  return (
    <ul className="flex flex-col gap-2">
      {(classTypes ?? []).map((ct) => (
        <ClassTypeRow key={ct.id} id={ct.id} initialName={ct.name} initialCapacity={ct.default_capacity} initialColor={ct.color} />
      ))}
      {(classTypes ?? []).length === 0 && <p className="text-sm text-neutral-400">No class types yet.</p>}
    </ul>
  );
}
