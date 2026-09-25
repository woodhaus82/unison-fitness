"use client";

import { useState, useTransition } from "react";
import { updateMemberRole, deleteMember } from "./actions";
import type { UserRole } from "@/lib/types/database";

export function MemberRow({
  id,
  fullName,
  email,
  role,
  isSelf,
}: {
  id: string;
  fullName: string | null;
  email: string;
  role: UserRole;
  isSelf: boolean;
}) {
  const [currentRole, setCurrentRole] = useState(role);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  function handleRoleChange(next: UserRole) {
    const previous = currentRole;
    setCurrentRole(next);
    startTransition(async () => {
      const result = await updateMemberRole(id, next);
      if (result.error) {
        setCurrentRole(previous);
        setError(result.error);
      } else {
        setError(null);
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete ${fullName ?? email}? This permanently removes their account, bookings and history. This cannot be undone.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteMember(id);
      if (result.error) setError(result.error);
      else setDeleted(true);
    });
  }

  if (deleted) return null;

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3">
      <div>
        <p className="font-medium">
          {fullName ?? email}
          {isSelf && <span className="ml-2 text-xs font-normal text-neutral-600">(you)</span>}
        </p>
        <p className="text-sm text-neutral-400">{email}</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={currentRole}
          disabled={pending || isSelf}
          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
          className="rounded-md border border-neutral-700 px-2 py-1.5 text-sm disabled:opacity-50"
        >
          <option value="member">Member</option>
          <option value="coach">Coach</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="button"
          disabled={pending || isSelf}
          onClick={handleDelete}
          className="rounded-md border border-red-900 px-3 py-1.5 text-sm font-medium text-red-400 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
