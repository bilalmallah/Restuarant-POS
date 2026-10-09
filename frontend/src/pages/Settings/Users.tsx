import { useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiShield } from "react-icons/fi";

import {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { useAuth } from "../../hooks/useStore";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import DataTable, { type Column } from "../../components/ui/DataTable";
import { Badge, Button, Card, Input, Select, Switch, EmptyState } from "../../components/ui/primitives";
import PageHeader from "../../components/layout/PageHeader";
import type { AuthUser, Role } from "../../types";

/**
 * Roles exist so a cashier cannot wander into payroll or delete a night's
 * sales. The server enforces the same three levels; this screen is where they
 * are handed out.
 */
const ROLES: { value: Role; label: string; blurb: string }[] = [
  {
    value: "cashier",
    label: "Cashier",
    blurb: "Takes orders, prints bills, settles payments, records expenses",
  },
  {
    value: "manager",
    label: "Manager",
    blurb: "Everything a cashier can do, plus the menu, staff, payroll and reports",
  },
  {
    value: "admin",
    label: "Admin",
    blurb: "Full access, including user accounts and deleting records",
  },
];

const emptyForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  role: "cashier" as Role,
  isActive: true,
};

const Users = () => {
  const toast = useToast();
  const { user: me } = useAuth();

  const { data: users = [], isLoading } = useListUsersQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: deletingNow }] = useDeleteUserMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [deleting, setDeleting] = useState<AuthUser | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (user: AuthUser) => {
    setEditing(user);
    setForm({
      name: user.name,
      username: user.username,
      email: user.email ?? "",
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setFormOpen(true);
  };

  useHotkeys([{ combo: SHORTCUTS.addNew.combo, handler: openNew }]);

  const save = async () => {
    try {
      if (editing) {
        await updateUser({
          id: editing.id,
          body: {
            name: form.name.trim(),
            email: form.email.trim() || null,
            role: form.role,
            isActive: form.isActive,
            // Only sent when actually typed, so editing a name never wipes a password.
            ...(form.password ? { password: form.password } : {}),
          },
        }).unwrap();
        toast.success(`${form.name} updated`);
      } else {
        await createUser({
          name: form.name.trim(),
          username: form.username.trim().toLowerCase(),
          email: form.email.trim() || null,
          password: form.password,
          role: form.role,
          isActive: form.isActive,
        }).unwrap();
        toast.success(`${form.name} can now sign in`);
      }
      setFormOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the user"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deleteUser(deleting.id).unwrap();
      toast.success("User deleted");
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not delete the user"));
    }
  };

  const columns: Column<AuthUser>[] = [
    {
      key: "name",
      header: "User",
      render: (user) => (
        <div>
          <span className="font-bold text-ink-900">{user.name}</span>
          {user.id === me?.id && (
            <Badge tone="info" className="ml-2">
              you
            </Badge>
          )}
          <span className="block font-mono text-xs text-ink-500">{user.username}</span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      hideOnMobile: true,
      render: (user) => user.email ?? <span className="text-ink-300">-</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (user) => (
        <Badge
          tone={user.role === "admin" ? "danger" : user.role === "manager" ? "warning" : "brand"}
          className="capitalize"
        >
          {user.role === "admin" && <FiShield className="size-3" />}
          {user.role}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user) =>
        user.isActive ? (
          <Badge tone="success">active</Badge>
        ) : (
          <Badge tone="default">disabled</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "90px",
      render: (user) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" icon={<FiEdit2 />} onClick={() => openEdit(user)} />
          <Button
            size="sm"
            variant="ghost"
            icon={<FiTrash2 />}
            className="text-red-500 hover:bg-red-50"
            disabled={user.id === me?.id}
            title={user.id === me?.id ? "You cannot delete your own account" : "Delete"}
            onClick={() => setDeleting(user)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Users"
        subtitle="Who can sign in, and what each of them is allowed to do"
        actions={
          <Button size="lg" icon={<FiPlus />} hint="Ctrl+N" onClick={openNew}>
            Add User
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {ROLES.map((role) => (
          <Card key={role.value}>
            <p className="mb-1 flex items-center gap-2 font-bold text-ink-900 capitalize">
              {role.value === "admin" && <FiShield className="size-4 text-red-500" />}
              {role.label}
              <span className="ml-auto text-sm font-normal text-ink-400">
                {users.filter((user) => user.role === role.value).length}
              </span>
            </p>
            <p className="text-xs leading-relaxed text-ink-500">{role.blurb}</p>
          </Card>
        ))}
      </div>

      <Card padded={false} className="overflow-hidden">
        <DataTable
          rows={users}
          columns={columns}
          rowKey={(user) => user.id}
          loading={isLoading}
          empty={<EmptyState icon={<FiUser />} title="No users yet" />}
        />
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add a user"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={creating || updating}
              onClick={save}
              disabled={
                !form.name.trim() ||
                (!editing && (!form.username.trim() || form.password.length < 6))
              }
            >
              {editing ? "Save changes" : "Create user"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Bilal Hussain"
              autoFocus
            />
            <Input
              label="Username"
              required={!editing}
              disabled={Boolean(editing)}
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              placeholder="bilal"
              hint={editing ? "Usernames cannot be changed" : "Lowercase, no spaces"}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="Optional"
            />
            <Input
              label={editing ? "New password" : "Password"}
              type="password"
              required={!editing}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              hint={editing ? "Leave blank to keep the current password" : "At least 6 characters"}
            />
          </div>

          <Select
            label="Role"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            disabled={editing?.id === me?.id}
            hint={
              editing?.id === me?.id
                ? "You cannot change your own role"
                : ROLES.find((role) => role.value === form.role)?.blurb
            }
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>

          <Switch
            label="Can sign in"
            hint="Turn off when someone leaves, instead of deleting the account"
            checked={form.isActive}
            onChange={(isActive) => setForm({ ...form, isActive })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingNow}
        title={`Delete ${deleting?.name}?`}
        message="They will not be able to sign in again. Bills they created keep their name on the record."
      />
    </div>
  );
};

export default Users;
