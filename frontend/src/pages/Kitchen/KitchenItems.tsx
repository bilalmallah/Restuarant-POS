import { useMemo, useRef, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiPackage } from "react-icons/fi";

import {
  useGetKitchenGroupsQuery,
  useListKitchenCategoriesQuery,
  useCreateKitchenItemMutation,
  useUpdateKitchenItemMutation,
  useDeleteKitchenItemMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { qty } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { Badge, Button, Card, Input, Select, Switch, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader, { FilterBar, SelectFilter } from "../../components/layout/PageHeader";
import type { KitchenUnit } from "../../types";

const UNITS: KitchenUnit[] = [
  "kg", "gram", "litre", "ml", "piece", "packet", "dozen", "bundle", "bottle", "tin",
];

type ItemRow = {
  id: number;
  name: string;
  unit: KitchenUnit;
  minQuantity: number;
  defaultOrderQuantity: number;
  supplier: string | null;
  kitchenCategoryId: number;
  categoryName: string;
};

const emptyForm = {
  name: "",
  kitchenCategoryId: "",
  unit: "kg" as KitchenUnit,
  minQuantity: "0",
  defaultOrderQuantity: "0",
  supplier: "",
  isActive: true,
};

const KitchenItems = () => {
  const toast = useToast();

  const { data: groups = [], isLoading } = useGetKitchenGroupsQuery();
  const { data: categories = [] } = useListKitchenCategoriesQuery({ isActive: "true" });

  const [createItem, { isLoading: creating }] = useCreateKitchenItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateKitchenItemMutation();
  const [deleteItem, { isLoading: deletingNow }] = useDeleteKitchenItemMutation();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ItemRow | null>(null);
  const [deleting, setDeleting] = useState<ItemRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const searchRef = useRef<HTMLInputElement>(null);

  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();

    return groups
      .filter((group) => !categoryFilter || String(group.id) === categoryFilter)
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !term ||
            item.name.toLowerCase().includes(term) ||
            item.supplier?.toLowerCase().includes(term)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search, categoryFilter]);

  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);

  const openNew = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      kitchenCategoryId: categoryFilter || (categories[0]?.id ? String(categories[0].id) : ""),
    });
    setFormOpen(true);
  };

  const openEdit = (item: ItemRow) => {
    setEditing(item);
    setForm({
      name: item.name,
      kitchenCategoryId: String(item.kitchenCategoryId),
      unit: item.unit,
      minQuantity: String(item.minQuantity),
      defaultOrderQuantity: String(item.defaultOrderQuantity),
      supplier: item.supplier ?? "",
      isActive: true,
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
      kitchenCategoryId: Number(form.kitchenCategoryId),
      unit: form.unit,
      minQuantity: Number(form.minQuantity) || 0,
      defaultOrderQuantity: Number(form.defaultOrderQuantity) || 0,
      supplier: form.supplier.trim() || null,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await updateItem({ id: editing.id, body }).unwrap();
        toast.success(`${body.name} updated`);
      } else {
        await createItem(body).unwrap();
        toast.success(`${body.name} added to the store list`);
      }
      setFormOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the item"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deleteItem(deleting.id).unwrap();
      toast.success(`${deleting.name} removed`);
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not delete the item"));
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Kitchen Items"
        subtitle="Everything your kitchen keeps in store. This list is what the closing checklist walks through each night."
        actions={
          <Button size="lg" icon={<FiPlus />} hint="Ctrl+N" onClick={openNew} disabled={!categories.length}>
            Add Item
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Items in store list" value={totalItems} tone="brand" />
        <StatTile label="Categories" value={groups.length} />
        <StatTile
          label="With a minimum level"
          value={groups.reduce(
            (sum, group) => sum + group.items.filter((item) => item.minQuantity > 0).length,
            0
          )}
          sub="flagged as low automatically"
        />
        <StatTile
          label="With a supplier"
          value={groups.reduce(
            (sum, group) => sum + group.items.filter((item) => item.supplier).length,
            0
          )}
        />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchRef={searchRef}
        placeholder="Search items or suppliers  (Ctrl+K)"
      >
        <SelectFilter
          label="Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
          allLabel="All categories"
          options={categories.map((category) => ({
            value: String(category.id),
            label: category.name,
          }))}
        />
      </FilterBar>

      {isLoading ? (
        <Card>
          <p className="text-sm text-ink-500">Loading...</p>
        </Card>
      ) : visibleGroups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FiPackage />}
            title={
              categories.length === 0
                ? "Add a kitchen category first"
                : search
                  ? `Nothing matches "${search}"`
                  : "No kitchen items yet"
            }
            message={
              categories.length === 0
                ? "Kitchen items are grouped by category - create Meat, Vegetables, Spices and so on first."
                : "Add the things you buy, so the closing sheet can ask about them."
            }
          />
        </Card>
      ) : (
        visibleGroups.map((group) => (
          <section key={group.id} className="mb-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wider text-ink-500 uppercase">
              {group.name}
              <Badge tone="default">{group.items.length}</Badge>
            </h2>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.items.map((item) => (
                <Card key={item.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink-900">{item.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge tone="brand">{item.unit}</Badge>
                      {item.minQuantity > 0 && (
                        <span className="text-ink-500">
                          min {qty(item.minQuantity)} {item.unit}
                        </span>
                      )}
                    </p>
                    {item.supplier && (
                      <p className="mt-1 truncate text-xs text-ink-400">from {item.supplier}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-0.5">
                    <Button size="sm" variant="ghost" icon={<FiEdit2 />} onClick={() => openEdit(item)} />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<FiTrash2 />}
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => setDeleting(item)}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add a kitchen item"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={creating || updating}
              onClick={save}
              disabled={!form.name.trim() || !form.kitchenCategoryId}
            >
              {editing ? "Save changes" : "Add item"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Item name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Chicken"
            autoFocus
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Category"
              required
              value={form.kitchenCategoryId}
              onChange={(event) => setForm({ ...form, kitchenCategoryId: event.target.value })}
            >
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            <Select
              label="Unit"
              value={form.unit}
              onChange={(event) => setForm({ ...form, unit: event.target.value as KitchenUnit })}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Minimum level"
              type="number"
              min={0}
              step={0.5}
              value={form.minQuantity}
              onChange={(event) => setForm({ ...form, minQuantity: event.target.value })}
              hint="Below this, closing flags it as low"
            />
            <Input
              label="Usual order size"
              type="number"
              min={0}
              step={0.5}
              value={form.defaultOrderQuantity}
              onChange={(event) => setForm({ ...form, defaultOrderQuantity: event.target.value })}
              hint="Pre-fills tomorrow's demand on the closing sheet"
            />
          </div>

          <Input
            label="Supplier"
            value={form.supplier}
            onChange={(event) => setForm({ ...form, supplier: event.target.value })}
            placeholder="Optional - printed on the purchase list"
          />

          <Switch
            label="Include in the closing checklist"
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
        message="Past closing sheets keep their own copy of this item, so your history stays intact."
      />
    </div>
  );
};

export default KitchenItems;
