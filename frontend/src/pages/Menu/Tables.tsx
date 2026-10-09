import { useMemo, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiGrid, FiUsers } from "react-icons/fi";

import {
  useListTablesQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { Badge, Button, Card, Input, Switch, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader from "../../components/layout/PageHeader";
import type { DiningTable } from "../../types";

const Tables = () => {
  const toast = useToast();

  const { data: tables = [], isLoading } = useListTablesQuery();
  const [createTable, { isLoading: creating }] = useCreateTableMutation();
  const [updateTable, { isLoading: updating }] = useUpdateTableMutation();
  const [deleteTable, { isLoading: deletingNow }] = useDeleteTableMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DiningTable | null>(null);
  const [deleting, setDeleting] = useState<DiningTable | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState({ prefix: "T", from: "1", to: "10", area: "Main Hall", capacity: "4" });
  const [form, setForm] = useState({ name: "", area: "Main Hall", capacity: "4", isActive: true });

  const areas = useMemo(() => [...new Set(tables.map((table) => table.area))], [tables]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", area: areas[0] ?? "Main Hall", capacity: "4", isActive: true });
    setFormOpen(true);
  };

  const openEdit = (table: DiningTable) => {
    setEditing(table);
    setForm({
      name: table.name,
      area: table.area,
      capacity: String(table.capacity),
      isActive: table.isActive,
    });
    setFormOpen(true);
  };

  useHotkeys([{ combo: SHORTCUTS.addNew.combo, handler: openNew }]);

  const save = async () => {
    const body = {
      name: form.name.trim(),
      area: form.area.trim() || "Main Hall",
      capacity: Number(form.capacity) || 4,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await updateTable({ id: editing.id, body }).unwrap();
        toast.success(`${body.name} updated`);
      } else {
        await createTable(body).unwrap();
        toast.success(`${body.name} added`);
      }
      setFormOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the table"));
    }
  };

  /**
   * Setting up a new restaurant means typing in twenty tables one at a time.
   * This creates a numbered run in one go, which is how they are named anyway.
   */
  const createBulk = async () => {
    const from = Number(bulk.from);
    const to = Number(bulk.to);

    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
      toast.error("Check the number range");
      return;
    }

    let created = 0;
    let skipped = 0;

    for (let number = from; number <= to; number += 1) {
      const name = `${bulk.prefix}${String(number).padStart(2, "0")}`;
      if (tables.some((table) => table.name === name)) {
        skipped += 1;
        continue;
      }

      try {
        await createTable({
          name,
          area: bulk.area.trim() || "Main Hall",
          capacity: Number(bulk.capacity) || 4,
          sortOrder: number,
        }).unwrap();
        created += 1;
      } catch {
        skipped += 1;
      }
    }

    toast.success(`${created} tables added${skipped ? `, ${skipped} skipped (already exist)` : ""}`);
    setBulkOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deleteTable(deleting.id).unwrap();
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not delete the table"));
    }
  };

  const totalSeats = tables.reduce((sum, table) => sum + table.capacity, 0);

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Tables"
        subtitle="Your floor plan. Areas group tables into sections on the POS screen."
        actions={
          <>
            <Button variant="secondary" size="lg" onClick={() => setBulkOpen(true)}>
              Add a range
            </Button>
            <Button size="lg" icon={<FiPlus />} hint="Ctrl+N" onClick={openNew}>
              Add Table
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tables" value={tables.length} tone="brand" />
        <StatTile label="Total Seats" value={totalSeats} icon={<FiUsers />} />
        <StatTile label="Areas" value={areas.length} />
        <StatTile label="Active" value={tables.filter((table) => table.isActive).length} />
      </div>

      {isLoading ? (
        <Card>
          <p className="text-sm text-ink-500">Loading...</p>
        </Card>
      ) : tables.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FiGrid />}
            title="No tables yet"
            message="Add your dining tables so waiters can seat customers."
            action={<Button onClick={() => setBulkOpen(true)}>Add a range of tables</Button>}
          />
        </Card>
      ) : (
        areas.map((area) => (
          <section key={area} className="mb-5">
            <h2 className="mb-2 text-sm font-bold tracking-wider text-ink-500 uppercase">
              {area}
              <span className="ml-2 font-normal text-ink-400">
                {tables.filter((table) => table.area === area).length} tables
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {tables
                .filter((table) => table.area === area)
                .map((table) => (
                  <Card key={table.id} className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-extrabold text-ink-900">{table.name}</p>
                      <p className="flex items-center gap-1 text-xs text-ink-500">
                        <FiUsers className="size-3" /> {table.capacity} seats
                      </p>
                      {!table.isActive && (
                        <Badge tone="default" className="mt-1">
                          inactive
                        </Badge>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-0.5">
                      <Button size="sm" variant="ghost" icon={<FiEdit2 />} onClick={() => openEdit(table)} />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<FiTrash2 />}
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => setDeleting(table)}
                      />
                    </div>
                  </Card>
                ))}
            </div>
          </section>
        ))
      )}

      {/* ---------------- Single table ---------------- */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add a table"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button loading={creating || updating} onClick={save} disabled={!form.name.trim()}>
              {editing ? "Save changes" : "Add table"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Table name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="T01"
            autoFocus
          />

          <Input
            label="Area"
            value={form.area}
            onChange={(event) => setForm({ ...form, area: event.target.value })}
            list="table-areas"
            placeholder="Main Hall"
            hint="Tables are grouped by area on the floor plan"
          />
          <datalist id="table-areas">
            {areas.map((area) => (
              <option key={area} value={area} />
            ))}
          </datalist>

          <Input
            label="Seats"
            type="number"
            min={1}
            value={form.capacity}
            onChange={(event) => setForm({ ...form, capacity: event.target.value })}
          />

          <Switch
            label="Active"
            hint="Inactive tables are hidden from the floor plan"
            checked={form.isActive}
            onChange={(isActive) => setForm({ ...form, isActive })}
          />
        </div>
      </Modal>

      {/* ---------------- Bulk create ---------------- */}
      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Add a range of tables"
        subtitle="Creates T01, T02, T03... in one go. Names that already exist are skipped."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button loading={creating} onClick={createBulk}>
              Create tables
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Prefix"
              value={bulk.prefix}
              onChange={(event) => setBulk({ ...bulk, prefix: event.target.value })}
            />
            <Input
              label="From"
              type="number"
              min={1}
              value={bulk.from}
              onChange={(event) => setBulk({ ...bulk, from: event.target.value })}
            />
            <Input
              label="To"
              type="number"
              min={1}
              value={bulk.to}
              onChange={(event) => setBulk({ ...bulk, to: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Area"
              value={bulk.area}
              onChange={(event) => setBulk({ ...bulk, area: event.target.value })}
            />
            <Input
              label="Seats each"
              type="number"
              min={1}
              value={bulk.capacity}
              onChange={(event) => setBulk({ ...bulk, capacity: event.target.value })}
            />
          </div>

          <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
            Creates{" "}
            <strong>
              {bulk.prefix}
              {String(Number(bulk.from) || 1).padStart(2, "0")}
            </strong>{" "}
            through{" "}
            <strong>
              {bulk.prefix}
              {String(Number(bulk.to) || 1).padStart(2, "0")}
            </strong>{" "}
            in {bulk.area || "Main Hall"}.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingNow}
        title={`Delete ${deleting?.name}?`}
        message="Past bills keep their record of this table. A table with a running order cannot be deleted."
      />
    </div>
  );
};

export default Tables;
