import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiArrowRight, FiPhone } from "react-icons/fi";

import {
  useListEmployeesWithBalancesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useToggleEmployeeMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { money, toDateInput } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import DataTable, { type Column } from "../../components/ui/DataTable";
import {
  Badge,
  Button,
  Card,
  Input,
  MoneyInput,
  Select,
  Switch,
  Textarea,
  EmptyState,
  StatTile,
} from "../../components/ui/primitives";
import PageHeader, { FilterBar, SelectFilter } from "../../components/layout/PageHeader";
import type { Employee, EmployeeRole, PayType } from "../../types";

const ROLES: EmployeeRole[] = ["waiter", "chef", "helper", "cashier", "manager", "cleaner", "other"];

const PAY_TYPES: { value: PayType; label: string; blurb: string }[] = [
  { value: "monthly", label: "Monthly salary", blurb: "A fixed amount posted once a month" },
  { value: "daily", label: "Daily wage", blurb: "Paid per day worked" },
  { value: "commission", label: "Commission only", blurb: "Earns a percentage of what they sell" },
];

const emptyForm = {
  name: "",
  phone: "",
  cnic: "",
  role: "waiter" as EmployeeRole,
  payType: "monthly" as PayType,
  monthlySalary: "",
  dailyWage: "",
  commissionPercent: "",
  isWaiter: true,
  joiningDate: toDateInput(),
  isActive: true,
  notes: "",
};

const Employees = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);

  const searchRef = useRef<HTMLInputElement>(null);

  const { data: employees = [], isLoading } = useListEmployeesWithBalancesQuery({ search, role });
  const [createEmployee, { isLoading: creating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
  const [deleteEmployee, { isLoading: deletingNow }] = useDeleteEmployeeMutation();
  const [toggleEmployee] = useToggleEmployeeMutation();

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, joiningDate: toDateInput() });
    setFormOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setForm({
      name: employee.name,
      phone: employee.phone ?? "",
      cnic: employee.cnic ?? "",
      role: employee.role,
      payType: employee.payType,
      monthlySalary: String(Number(employee.monthlySalary) || ""),
      dailyWage: String(Number(employee.dailyWage) || ""),
      commissionPercent: String(Number(employee.commissionPercent) || ""),
      isWaiter: employee.isWaiter,
      joiningDate: employee.joiningDate ?? toDateInput(),
      isActive: employee.isActive,
      notes: employee.notes ?? "",
    });
    setFormOpen(true);
  };

  useHotkeys([
    { combo: SHORTCUTS.addNew.combo, handler: openNew },
    { combo: SHORTCUTS.search.combo, handler: () => searchRef.current?.focus() },
  ]);

  const save = async () => {
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      cnic: form.cnic.trim() || null,
      role: form.role,
      payType: form.payType,
      monthlySalary: Number(form.monthlySalary) || 0,
      dailyWage: Number(form.dailyWage) || 0,
      commissionPercent: Number(form.commissionPercent) || 0,
      isWaiter: form.isWaiter,
      joiningDate: form.joiningDate || null,
      isActive: form.isActive,
      notes: form.notes.trim() || null,
    };

    try {
      if (editing) {
        await updateEmployee({ id: editing.id, body }).unwrap();
        toast.success(`${body.name} updated`);
      } else {
        await createEmployee(body).unwrap();
        toast.success(`${body.name} added to the team`);
      }
      setFormOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the employee"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deleteEmployee(deleting.id).unwrap();
      toast.success(`${deleting.name} removed`);
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not remove this employee"));
    }
  };

  const payLabel = (employee: Employee) => {
    if (employee.payType === "monthly") return `${money(employee.monthlySalary)} / month`;
    if (employee.payType === "daily") return `${money(employee.dailyWage)} / day`;
    return `${Number(employee.commissionPercent)}% commission`;
  };

  const totals = {
    active: employees.filter((employee) => employee.isActive).length,
    waiters: employees.filter((employee) => employee.isWaiter && employee.isActive).length,
    pending: employees.reduce((sum, employee) => sum + Math.max(employee.pending ?? 0, 0), 0),
    advances: employees.reduce((sum, employee) => sum + Math.min(employee.pending ?? 0, 0), 0),
  };

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: "Employee",
      render: (employee) => (
        <div>
          <span className="font-bold text-ink-900">{employee.name}</span>
          {!employee.isActive && (
            <Badge tone="default" className="ml-2">
              inactive
            </Badge>
          )}
          {employee.phone && (
            <span className="flex items-center gap-1 text-xs text-ink-500">
              <FiPhone className="size-3" />
              {employee.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (employee) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone="brand" className="capitalize">
            {employee.role}
          </Badge>
          {employee.isWaiter && <Badge tone="info">takes orders</Badge>}
        </div>
      ),
    },
    {
      key: "pay",
      header: "Pay",
      hideOnMobile: true,
      render: (employee) => (
        <div>
          <span className="tabular font-semibold text-ink-800">{payLabel(employee)}</span>
          {employee.payType !== "commission" && Number(employee.commissionPercent) > 0 && (
            <span className="block text-xs text-ink-500">
              plus {Number(employee.commissionPercent)}% commission
            </span>
          )}
        </div>
      ),
    },
    {
      key: "pending",
      header: "Pending",
      align: "right",
      render: (employee) => {
        const pending = employee.pending ?? 0;

        return (
          <div>
            <span
              className={clsx(
                "tabular text-base font-extrabold",
                pending > 0 ? "text-amber-700" : pending < 0 ? "text-sky-700" : "text-ink-400"
              )}
            >
              {money(Math.abs(pending))}
            </span>
            <span className="block text-[10px] font-bold text-ink-400 uppercase">
              {pending > 0 ? "you owe them" : pending < 0 ? "advance taken" : "settled"}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "170px",
      render: (employee) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="secondary"
            icon={<FiArrowRight />}
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/staff/${employee.id}`);
            }}
          >
            Ledger
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<FiEdit2 />}
            onClick={(event) => {
              event.stopPropagation();
              openEdit(employee);
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<FiTrash2 />}
            className="text-red-500 hover:bg-red-50"
            onClick={(event) => {
              event.stopPropagation();
              setDeleting(employee);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Employees"
        subtitle="Your team, how each person is paid, and what is still owed to them"
        actions={
          <Button size="lg" icon={<FiPlus />} hint="Ctrl+N" onClick={openNew}>
            Add Employee
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Active Staff" value={totals.active} tone="brand" icon={<FiUsers />} />
        <StatTile label="Waiters" value={totals.waiters} sub="appear in the order screen" />
        <StatTile
          label="Total Pending"
          value={money(totals.pending)}
          sub="salary and commission owed"
          tone={totals.pending > 0 ? "warning" : "default"}
        />
        <StatTile
          label="Advances Outstanding"
          value={money(Math.abs(totals.advances))}
          sub="to recover from salary"
          tone={totals.advances < 0 ? "danger" : "default"}
        />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchRef={searchRef}
        placeholder="Search staff by name or phone  (Ctrl+K)"
      >
        <SelectFilter
          label="Role"
          value={role}
          onChange={setRole}
          allLabel="All roles"
          options={ROLES.map((value) => ({ value, label: value }))}
        />
      </FilterBar>

      <Card padded={false} className="overflow-hidden">
        <DataTable
          rows={employees}
          columns={columns}
          rowKey={(employee) => employee.id}
          loading={isLoading}
          onRowClick={(employee) => navigate(`/staff/${employee.id}`)}
          empty={
            <EmptyState
              icon={<FiUsers />}
              title={search ? `Nobody matches "${search}"` : "No employees yet"}
              message="Add your waiters and kitchen staff so orders can be attributed and salaries tracked."
              action={<Button onClick={openNew}>Add the first employee</Button>}
            />
          }
        />
      </Card>

      {/* ---------------- Form ---------------- */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add an employee"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button loading={creating || updating} onClick={save} disabled={!form.name.trim()}>
              {editing ? "Save changes" : "Add employee"}
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
              placeholder="Asif Ali"
              autoFocus
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="0300-1234567"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Role"
              value={form.role}
              onChange={(event) => {
                const nextRole = event.target.value as EmployeeRole;
                // Picking "waiter" should obviously make them a waiter; picking
                // "chef" should obviously not.
                setForm({ ...form, role: nextRole, isWaiter: nextRole === "waiter" });
              }}
            >
              {ROLES.map((value) => (
                <option key={value} value={value} className="capitalize">
                  {value}
                </option>
              ))}
            </Select>

            <Input
              label="CNIC"
              value={form.cnic}
              onChange={(event) => setForm({ ...form, cnic: event.target.value })}
              placeholder="Optional"
            />

            <Input
              label="Joined on"
              type="date"
              value={form.joiningDate}
              onChange={(event) => setForm({ ...form, joiningDate: event.target.value })}
            />
          </div>

          {/* ---------------- Pay structure ---------------- */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-600 uppercase">
              How is this person paid
            </span>

            <div className="grid gap-2 sm:grid-cols-3">
              {PAY_TYPES.map((option) => {
                const active = form.payType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm({ ...form, payType: option.value })}
                    className={clsx(
                      "rounded-lg border-2 p-3 text-left transition-colors",
                      active
                        ? "border-brand-500 bg-brand-50"
                        : "border-ink-200 hover:border-ink-300"
                    )}
                  >
                    <span
                      className={clsx(
                        "block text-sm font-bold",
                        active ? "text-brand-700" : "text-ink-700"
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-500">{option.blurb}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MoneyInput
              label="Monthly salary"
              value={form.monthlySalary}
              onChange={(event) => setForm({ ...form, monthlySalary: event.target.value })}
              disabled={form.payType !== "monthly"}
              required={form.payType === "monthly"}
            />
            <MoneyInput
              label="Daily wage"
              value={form.dailyWage}
              onChange={(event) => setForm({ ...form, dailyWage: event.target.value })}
              disabled={form.payType !== "daily"}
              required={form.payType === "daily"}
            />
            <Input
              label="Commission %"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.commissionPercent}
              onChange={(event) => setForm({ ...form, commissionPercent: event.target.value })}
              hint="Can be combined with a salary"
            />
          </div>

          <Switch
            label="Takes orders (show in the waiter list)"
            hint="Only these people appear when starting an order on a table"
            checked={form.isWaiter}
            onChange={(isWaiter) => setForm({ ...form, isWaiter })}
          />

          <Switch
            label="Currently working here"
            hint="Turn off when someone leaves - their history and ledger stay"
            checked={form.isActive}
            onChange={(isActive) => setForm({ ...form, isActive })}
          />

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />

          {editing && (
            <Button
              variant="secondary"
              block
              onClick={async () => {
                await toggleEmployee(editing.id).unwrap();
                toast.success(`${editing.name} ${editing.isActive ? "deactivated" : "activated"}`);
                setFormOpen(false);
              }}
            >
              {editing.isActive ? "Deactivate this employee" : "Reactivate this employee"}
            </Button>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingNow}
        title={`Remove ${deleting?.name}?`}
        message="Anyone who has served an order cannot be deleted - deactivate them instead so your sales history and their ledger survive."
      />
    </div>
  );
};

export default Employees;
