import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { FiPlus, FiEdit2, FiTrash2, FiBookOpen, FiPhone, FiArrowRight } from "react-icons/fi";

import {
  useListCreditPersonsQuery,
  useCreateCreditPersonMutation,
  useUpdateCreditPersonMutation,
  useDeleteCreditPersonMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { useCan } from "../../hooks/useStore";
import { money, formatDate } from "../../utils/format";
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
  Switch,
  Textarea,
  EmptyState,
  StatTile,
} from "../../components/ui/primitives";
import PageHeader, { FilterBar } from "../../components/layout/PageHeader";
import type { CreditPerson } from "../../types";

const emptyForm = {
  name: "",
  phone: "",
  company: "",
  address: "",
  creditLimit: "0",
  openingBalance: "0",
  notes: "",
  isActive: true,
};

const CreditBook = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isManager, isAdmin } = useCan();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CreditPerson | null>(null);
  const [deleting, setDeleting] = useState<CreditPerson | null>(null);
  const [form, setForm] = useState(emptyForm);

  const searchRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useListCreditPersonsQuery({ search });
  const [createPerson, { isLoading: creating }] = useCreateCreditPersonMutation();
  const [updatePerson, { isLoading: updating }] = useUpdateCreditPersonMutation();
  const [deletePerson, { isLoading: deletingNow }] = useDeleteCreditPersonMutation();

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (person: CreditPerson) => {
    setEditing(person);
    setForm({
      name: person.name,
      phone: person.phone ?? "",
      company: person.company ?? "",
      address: person.address ?? "",
      creditLimit: String(Number(person.creditLimit) || 0),
      openingBalance: "0",
      notes: person.notes ?? "",
      isActive: person.isActive,
    });
    setFormOpen(true);
  };

  useHotkeys([
    { combo: SHORTCUTS.addNew.combo, handler: () => isManager && openNew() },
    { combo: SHORTCUTS.search.combo, handler: () => searchRef.current?.focus() },
  ]);

  const save = async () => {
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      address: form.address.trim() || null,
      creditLimit: Number(form.creditLimit) || 0,
      openingBalance: Number(form.openingBalance) || 0,
      notes: form.notes.trim() || null,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await updatePerson({ id: editing.id, body }).unwrap();
        toast.success(`${body.name} updated`);
      } else {
        await createPerson(body).unwrap();
        toast.success(`${body.name} added to the credit book`);
      }
      setFormOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deletePerson(deleting.id).unwrap();
      toast.success(`${deleting.name} removed`);
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not remove this person"));
    }
  };

  const columns: Column<CreditPerson>[] = [
    {
      key: "name",
      header: "Person",
      render: (person) => (
        <div>
          <span className="font-bold text-ink-900">{person.name}</span>
          {!person.isActive && (
            <Badge tone="default" className="ml-2">
              blocked
            </Badge>
          )}
          {person.company && <span className="block text-xs text-ink-500">{person.company}</span>}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      hideOnMobile: true,
      render: (person) =>
        person.phone ? (
          <span className="flex items-center gap-1 text-ink-600">
            <FiPhone className="size-3" />
            {person.phone}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "accounts",
      header: "Accounts",
      align: "center",
      hideOnMobile: true,
      render: (person) => <span className="tabular">{person.accounts?.length ?? 0}</span>,
    },
    {
      key: "last",
      header: "Last entry",
      hideOnMobile: true,
      render: (person) =>
        person.lastEntryDate ? (
          formatDate(person.lastEntryDate)
        ) : (
          <span className="text-xs text-ink-400">never</span>
        ),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      render: (person) => {
        const balance = person.balance ?? 0;

        return (
          <div>
            <span
              className={clsx(
                "tabular text-base font-extrabold",
                balance > 0 ? "text-red-600" : balance < 0 ? "text-emerald-600" : "text-ink-400"
              )}
            >
              {money(Math.abs(balance))}
            </span>
            <span className="block text-[10px] font-bold text-ink-400 uppercase">
              {balance > 0 ? "they owe you" : balance < 0 ? "advance paid" : "settled"}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "150px",
      render: (person) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="secondary"
            icon={<FiArrowRight />}
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/credit/${person.id}`);
            }}
          >
            Open
          </Button>
          {isManager && (
            <Button
              size="sm"
              variant="ghost"
              icon={<FiEdit2 />}
              onClick={(event) => {
                event.stopPropagation();
                openEdit(person);
              }}
            />
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              icon={<FiTrash2 />}
              className="text-red-500 hover:bg-red-50"
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(person);
              }}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Credit Book"
        subtitle="Who owes you money. Only people listed here can have a bill put on credit at the till."
        actions={
          isManager && (
            <Button size="lg" icon={<FiPlus />} hint="Ctrl+N" onClick={openNew}>
              Add Person
            </Button>
          )
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="People" value={data?.totals.people ?? 0} tone="brand" icon={<FiBookOpen />} />
        <StatTile
          label="Total Outstanding"
          value={money(data?.totals.outstanding ?? 0)}
          sub="still to be collected"
          tone={(data?.totals.outstanding ?? 0) > 0 ? "danger" : "default"}
        />
        <StatTile
          label="Advances Held"
          value={money(Math.abs(data?.totals.advance ?? 0))}
          sub="paid ahead by customers"
          tone="success"
        />
        <StatTile
          label="Active accounts"
          value={data?.rows.filter((row) => row.isActive).length ?? 0}
        />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchRef={searchRef}
        placeholder="Search by name, phone or company  (Ctrl+K)"
      />

      <Card padded={false} className="overflow-hidden">
        <DataTable
          rows={data?.rows ?? []}
          columns={columns}
          rowKey={(person) => person.id}
          loading={isLoading}
          onRowClick={(person) => navigate(`/credit/${person.id}`)}
          empty={
            <EmptyState
              icon={<FiBookOpen />}
              title={search ? `Nobody matches "${search}"` : "The credit book is empty"}
              message="Add the regulars who take food on account, so the till can put a bill on their khata."
              action={isManager && <Button onClick={openNew}>Add the first person</Button>}
            />
          }
        />
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add someone to the credit book"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button loading={creating || updating} onClick={save} disabled={!form.name.trim()}>
              {editing ? "Save changes" : "Add to credit book"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Sohail Traders"
              autoFocus
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="0300-1234567"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Company"
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
              placeholder="Optional"
            />
            <MoneyInput
              label="Credit limit"
              value={form.creditLimit}
              onChange={(event) => setForm({ ...form, creditLimit: event.target.value })}
              hint="0 means no limit - you are only warned, never blocked"
            />
          </div>

          <Input
            label="Address"
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            placeholder="Optional"
          />

          {!editing && (
            <MoneyInput
              label="Opening balance"
              value={form.openingBalance}
              onChange={(event) => setForm({ ...form, openingBalance: event.target.value })}
              hint="What they already owe you from the old paper book"
            />
          )}

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            placeholder="Anything worth remembering about this account"
          />

          <Switch
            label="Allowed to take credit"
            hint="Turn this off to stop new credit without losing their history"
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
        title={`Remove ${deleting?.name}?`}
        message="Anyone with entries in the book cannot be deleted - block them instead so the history survives."
      />
    </div>
  );
};

export default CreditBook;
