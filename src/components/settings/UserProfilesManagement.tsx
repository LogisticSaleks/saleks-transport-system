"use client";

import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import { useCan } from "@/components/auth/AuthContext";
import type {
  UserProfileSettings,
  UserProfilesResult,
  UserRoleValue,
  UserStatusValue,
} from "@/lib/settings/userProfiles";

type UserProfilesManagementProps = {
  initialResult: UserProfilesResult;
};

type EditableUserProfileField =
  | "authUserId"
  | "email"
  | "fullName"
  | "notes";

type RoleFilterValue = "ALL" | UserRoleValue;
type StatusFilterValue = "ALL" | UserStatusValue;

type UserProfilesApiResponse = Partial<UserProfilesResult> & {
  user?: UserProfileSettings;
  error?: string;
};

const USER_ROLES: readonly {
  value: UserRoleValue;
  label: string;
  description: string;
}[] = [
  {
    value: "OWNER",
    label: "Owner",
    description: "Full control over system settings and access.",
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Manage most operational data and settings.",
  },
  {
    value: "DISPATCHER",
    label: "Dispatcher",
    description: "Create and edit transport operational data.",
  },
  {
    value: "FINANCE",
    label: "Finance",
    description: "Work with settlement, reports and financial checks.",
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Read-only access after API protection is enabled.",
  },
];

const USER_STATUSES: readonly {
  value: UserStatusValue;
  label: string;
  description: string;
}[] = [
  {
    value: "ACTIVE",
    label: "Active",
    description:
      "Approved user. Can log in and use the system according to role permissions.",
  },
  {
    value: "PENDING",
    label: "Pending",
    description: "Registered user waiting for OWNER approval.",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
    description: "Blocked user. Cannot access the system.",
  },
];

const EMPTY_USER_PROFILE: UserProfileSettings = {
  id: null,
  authUserId: "",
  email: "",
  fullName: "",
  role: "VIEWER",
  status: "PENDING",
  notes: "",
  lastSeenAt: null,
  createdAt: null,
  updatedAt: null,
};

export default function UserProfilesManagement({
  initialResult,
}: UserProfilesManagementProps) {
  const canManageUsers = useCan("users:manage");

  const [users, setUsers] = useState<UserProfileSettings[]>(
    initialResult.users,
  );

  const [formState, setFormState] =
    useState<UserProfileSettings>(EMPTY_USER_PROFILE);

  const [roleFilter, setRoleFilter] =
    useState<RoleFilterValue>("ALL");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilterValue>("ALL");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [deletingUserId, setDeletingUserId] =
    useState<string | null>(null);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [saveMessage, setSaveMessage] =
    useState<string | null>(null);

  const summary = useMemo(
    () => calculateUserProfileSummary(users),
    [users],
  );

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        if (roleFilter !== "ALL" && user.role !== roleFilter) {
          return false;
        }

        if (statusFilter !== "ALL" && user.status !== statusFilter) {
          return false;
        }

        const normalizedQuery = searchQuery
          .trim()
          .toLocaleLowerCase("en-US");

        if (normalizedQuery === "") {
          return true;
        }

        return [
          user.email,
          user.fullName,
          user.authUserId,
          user.notes,
          user.role,
          user.status,
        ]
          .join(" ")
          .toLocaleLowerCase("en-US")
          .includes(normalizedQuery);
      }),
    [users, roleFilter, statusFilter, searchQuery],
  );

  const isEditing = formState.id !== null;
  const isDeleting = deletingUserId !== null;

  function handleFieldChange(
    field: EditableUserProfileField,
    value: string,
  ): void {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));

    setSaveError(null);
    setSaveMessage(null);
  }

  function handleRoleChange(
    event: ChangeEvent<HTMLSelectElement>,
  ): void {
    const value = event.target.value;

    setFormState((currentState) => ({
      ...currentState,
      role: isUserRole(value) ? value : "VIEWER",
    }));

    setSaveError(null);
    setSaveMessage(null);
  }

  function handleStatusChange(
    event: ChangeEvent<HTMLSelectElement>,
  ): void {
    const value = event.target.value;

    setFormState((currentState) => ({
      ...currentState,
      status: isUserStatus(value) ? value : "PENDING",
    }));

    setSaveError(null);
    setSaveMessage(null);
  }

  function handleEdit(user: UserProfileSettings): void {
    if (!canManageUsers || isDeleting) {
      return;
    }

    setFormState(user);
    setSaveError(null);
    setSaveMessage(null);

    window.requestAnimationFrame(() => {
      document
        .getElementById("user-profile-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  function handleCancelEdit(): void {
    setFormState(EMPTY_USER_PROFILE);
    setSaveError(null);
    setSaveMessage(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!canManageUsers) {
      setSaveError(
        "Only OWNER can update user profiles.",
      );
      setSaveMessage(null);
      return;
    }

    if (!isEditing) {
      setSaveError(
        "Select a registered user from the table before saving changes.",
      );
      setSaveMessage(null);
      return;
    }

    const validationError = validateUserProfile(formState);

    if (validationError) {
      setSaveError(validationError);
      setSaveMessage(null);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/settings/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const responseData =
        (await response.json().catch(() => null)) as
          | UserProfilesApiResponse
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "User profile could not be saved.",
        );
      }

      if (!responseData?.users) {
        throw new Error(
          "API did not return the updated user list.",
        );
      }

      setUsers(responseData.users);
      setFormState(EMPTY_USER_PROFILE);
      setSaveMessage("User profile updated.");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "User profile could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user: UserProfileSettings): Promise<void> {
    if (!canManageUsers || isDeleting) {
      return;
    }

    if (!user.id) {
      setSaveError("User profile id is required before delete.");
      setSaveMessage(null);
      return;
    }

    const confirmed = window.confirm(
      [
        `Delete user account ${user.email}?`,
        "",
        "This will remove the user profile and all active sessions for this user.",
        "The user will not be able to access Saleks Transport System anymore.",
      ].join("\n"),
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(user.id);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/settings/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
        }),
      });

      const responseData =
        (await response.json().catch(() => null)) as
          | UserProfilesApiResponse
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "User profile could not be deleted.",
        );
      }

      if (!responseData?.users) {
        throw new Error(
          "API did not return the updated user list.",
        );
      }

      setUsers(responseData.users);

      if (formState.id === user.id) {
        setFormState(EMPTY_USER_PROFILE);
      }

      setSaveMessage(`User account ${user.email} deleted.`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "User profile could not be deleted.",
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  function handleClearFilters(): void {
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total users" value={summary.total} />
        <SummaryCard label="Active" value={summary.active} tone="positive" />
        <SummaryCard label="Pending" value={summary.pending} tone="warning" />
        <SummaryCard label="Inactive" value={summary.inactive} tone="danger" />
        <SummaryCard label="Viewers" value={summary.viewers} />
      </section>

      <section
        id="user-profile-form"
        className={[
          "rounded-2xl border bg-white p-5 shadow-sm",
          isEditing
            ? "border-sky-300 ring-2 ring-sky-100"
            : "border-slate-200",
        ].join(" ")}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {isEditing ? "Approve or edit user" : "Select a user to approve"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              New users will register themselves. OWNER reviews the profile,
              assigns the correct role and changes the status from Pending to Active.
            </p>

            {!canManageUsers && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                Твоята роля може да вижда users, но само OWNER може да одобрява и променя user profiles.
              </p>
            )}
          </div>

          {isEditing && canManageUsers && (
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving || isDeleting}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel edit
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TextField
              label="Auth user id"
              value={formState.authUserId}
              required
              placeholder="Internal auth id"
              className="xl:col-span-2"
              disabled={!canManageUsers || !isEditing || isSaving || isDeleting}
              onChange={(value) =>
                handleFieldChange("authUserId", value)
              }
            />

            <TextField
              label="Email"
              value={formState.email}
              required
              placeholder="user@example.com"
              disabled={!canManageUsers || !isEditing || isSaving || isDeleting}
              onChange={(value) =>
                handleFieldChange("email", value)
              }
            />

            <TextField
              label="Full name"
              value={formState.fullName}
              placeholder="Name shown internally"
              disabled={!canManageUsers || !isEditing || isSaving || isDeleting}
              onChange={(value) =>
                handleFieldChange("fullName", value)
              }
            />

            <SelectField
              label="Role"
              value={formState.role}
              disabled={!canManageUsers || !isEditing || isSaving || isDeleting}
              onChange={handleRoleChange}
            >
              {USER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Status"
              value={formState.status}
              disabled={!canManageUsers || !isEditing || isSaving || isDeleting}
              onChange={handleStatusChange}
            >
              {USER_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </SelectField>

            <TextField
              label="Notes"
              value={formState.notes}
              placeholder="Internal notes"
              className="xl:col-span-2"
              disabled={!canManageUsers || !isEditing || isSaving || isDeleting}
              onChange={(value) =>
                handleFieldChange("notes", value)
              }
            />
          </div>

          <RoleHelp />
          <StatusHelp />

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              {saveError && (
                <div
                  role="alert"
                  className="font-medium text-red-700"
                >
                  {saveError}
                </div>
              )}

              {saveMessage && (
                <div className="font-medium text-emerald-700">
                  {saveMessage}
                </div>
              )}

              {!saveError && !saveMessage && (
                <span>
                  {canManageUsers
                    ? isEditing
                      ? "Save the selected user's role/status changes."
                      : "Select a user from the table below before saving."
                    : "Read-only view. Only OWNER can approve or update user profiles."}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving || isDeleting || !canManageUsers || !isEditing}
              aria-busy={isSaving}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!canManageUsers
                ? "Read-only"
                : isSaving
                  ? "Saving..."
                  : isEditing
                    ? "Save user profile"
                    : "Select user first"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              User profiles
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredUsers.length} shown from {users.length} total profiles.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Search
              <input
                type="search"
                value={searchQuery}
                placeholder="Email, name, id, notes"
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                className="h-10 rounded-md border border-slate-400 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Role
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    readRoleFilterValue(event.target.value),
                  )
                }
                className="h-10 rounded-md border border-slate-400 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="ALL">All roles</option>
                {USER_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Status
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    readStatusFilterValue(event.target.value),
                  )
                }
                className="h-10 rounded-md border border-slate-400 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="ALL">All statuses</option>
                {USER_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={
                roleFilter === "ALL" &&
                statusFilter === "ALL" &&
                searchQuery.trim() === ""
              }
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-400 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-300">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Auth user id</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredUsers.map((user) => (
                <tr key={user.id ?? user.authUserId}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold text-slate-900">
                      {user.email}
                    </div>

                    <div className="text-xs text-slate-500">
                      {user.fullName || "No full name"}
                    </div>

                    {user.notes.trim() !== "" && (
                      <div className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                        {user.notes}
                      </div>
                    )}
                  </td>

                  <td className="max-w-xs px-4 py-3 align-top font-mono text-xs text-slate-600">
                    <span className="break-all">{user.authUserId}</span>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <RoleBadge role={user.role} />
                  </td>

                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={user.status} />
                  </td>

                  <td className="px-4 py-3 align-top text-slate-600">
                    {formatNullableDateTime(user.lastSeenAt)}
                  </td>

                  <td className="px-4 py-3 align-top text-slate-600">
                    {formatNullableDateTime(user.updatedAt)}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(user)}
                        disabled={!canManageUsers || isDeleting}
                        title={
                          canManageUsers
                            ? user.status === "PENDING"
                              ? "Review pending user"
                              : "Edit user profile"
                            : "Only OWNER can edit user profiles"
                        }
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {canManageUsers
                          ? user.status === "PENDING"
                            ? "Review"
                            : "Edit"
                          : "Read-only"}
                      </button>

                      {canManageUsers && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(user)}
                          disabled={
                            isDeleting ||
                            !user.id
                          }
                          title="Delete user account"
                          className="inline-flex h-9 items-center justify-center rounded-md border border-red-300 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingUserId === user.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No user profiles match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "positive" | "warning" | "danger";
}) {
  const valueClassName =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "danger"
          ? "text-red-700"
          : "text-slate-950";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div
        className={[
          "mt-2 text-2xl font-bold",
          valueClassName,
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  className = "",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={[
        "flex flex-col gap-1.5 text-sm font-semibold text-slate-800",
        className,
      ].join(" ")}
    >
      {label}
      <input
        type="text"
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "h-10 rounded-md border px-3 text-sm outline-none transition",
          disabled
            ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-700"
            : "border-slate-400 bg-white text-slate-950 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
        ].join(" ")}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={onChange}
        className={[
          "h-10 rounded-md border px-3 text-sm outline-none transition",
          disabled
            ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-700"
            : "border-slate-400 bg-white text-slate-950 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
        ].join(" ")}
      >
        {children}
      </select>
    </label>
  );
}

function RoleHelp() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {USER_ROLES.map((role) => (
        <div
          key={role.value}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
        >
          <div className="text-sm font-semibold text-slate-900">
            {role.label}
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {role.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusHelp() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {USER_STATUSES.map((status) => (
        <div
          key={status.value}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
        >
          <div className="text-sm font-semibold text-slate-900">
            {status.label}
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {status.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role: UserRoleValue;
}) {
  const className =
    role === "OWNER"
      ? "border-purple-200 bg-purple-50 text-purple-700"
      : role === "ADMIN"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : role === "DISPATCHER"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : role === "FINANCE"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {getRoleLabel(role)}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: UserStatusValue;
}) {
  const className =
    status === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "PENDING"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function calculateUserProfileSummary(
  users: readonly UserProfileSettings[],
): UserProfilesResult["summary"] {
  const summary: UserProfilesResult["summary"] = {
    total: users.length,
    active: 0,
    pending: 0,
    inactive: 0,
    owners: 0,
    admins: 0,
    dispatchers: 0,
    finance: 0,
    viewers: 0,
  };

  for (const user of users) {
    if (user.status === "ACTIVE") {
      summary.active += 1;
    } else if (user.status === "PENDING") {
      summary.pending += 1;
    } else {
      summary.inactive += 1;
    }

    switch (user.role) {
      case "OWNER":
        summary.owners += 1;
        break;
      case "ADMIN":
        summary.admins += 1;
        break;
      case "DISPATCHER":
        summary.dispatchers += 1;
        break;
      case "FINANCE":
        summary.finance += 1;
        break;
      case "VIEWER":
        summary.viewers += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

function validateUserProfile(
  user: UserProfileSettings,
): string | null {
  if (user.authUserId.trim() === "") {
    return "Auth user id is required.";
  }

  if (user.email.trim() === "") {
    return "Email is required.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim())) {
    return "A valid email address is required.";
  }

  return null;
}

function readRoleFilterValue(value: string): RoleFilterValue {
  return value === "ALL" || isUserRole(value) ? value : "ALL";
}

function readStatusFilterValue(value: string): StatusFilterValue {
  return value === "ALL" || isUserStatus(value) ? value : "ALL";
}

function isUserRole(value: string): value is UserRoleValue {
  return USER_ROLES.some((role) => role.value === value);
}

function isUserStatus(value: string): value is UserStatusValue {
  return USER_STATUSES.some((status) => status.value === value);
}

function getRoleLabel(role: UserRoleValue): string {
  return USER_ROLES.find((option) => option.value === role)?.label ?? role;
}

function getStatusLabel(status: UserStatusValue): string {
  return USER_STATUSES.find((option) => option.value === status)?.label ?? status;
}

function formatNullableDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}