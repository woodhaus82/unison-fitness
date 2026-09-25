export function WorkoutLink({ wod, className }: { wod: string | null; className?: string }) {
  return (
    <details>
      <summary
        className={
          (className ?? "text-sm font-medium text-white underline") +
          " cursor-pointer list-none [&::-webkit-details-marker]:hidden"
        }
      >
        View workout
      </summary>
      <div className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm">
        {wod ? (
          <p className="whitespace-pre-wrap text-neutral-200">{wod}</p>
        ) : (
          <p className="text-neutral-400">No workout posted, please check later.</p>
        )}
      </div>
    </details>
  );
}
