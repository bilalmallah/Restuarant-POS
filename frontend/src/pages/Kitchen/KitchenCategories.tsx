import { useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiLayers } from "react-icons/fi";

import {
  useListKitchenCategoriesQuery,
  useGetKitchenGroupsQuery,
  useCreateKitchenCategoryMutation,
  useUpdateKitchenCategoryMutation,
  useDeleteKitchenCategoryMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { Badge, Button, Card, Input, Switch, EmptyState } from "../../components/ui/primitives";
import PageHeader from "../../components/layout/PageHeader";
import type { KitchenCategory } from "../../types";

const SUGGESTIONS = ["Meat", "Vegetables", "Dry Goods", "Dairy", "Spices", "Beverages", "Supplies", "Utilities"];

const KitchenCategories = () => {
  const toast = useToast();

  const { data: categories = [], isLoading } = useListKitchenCategoriesQuery();
  const { data: groups = [] } = useGetKitchenGroupsQuery();

  const [createCategory, { isLoading: creating }] = useCreateKitchenCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateKitchenCategoryMutation();
  const [deleteCategory, { isLoading: deletingNow }] = useDeleteKitchenCategoryMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KitchenCategory | null>(null);
  const [deleting, setDeleting] = useState<KitchenCategory | null>(null);
  const [form, setForm] = useState({ name: "", isActive: true });

  const countFor = (id: number) => groups.find((group) => group.id === id)?.items.length ?? 0;

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", isActive: true });
    setFormOpen(true);
  };

  const openEdit = (category: KitchenCategory) => {
    setEditing(category);
    setForm({ name: category.name, isActive: category.isActive });
    setFormOpen(true);
  };

  useHotkeys([{ combo: SHORTCUTS.addNew.combo, handler: openNew }]);

  const save = async () => {
    const body = { name: form.name.trim(), isActive: form.isActive };

    try {
      if (editing) {
        await updateCategory({ id: editing.id, body }).unwrap();
        toast.success(`${body.name} updated`);
      } else {
        await createCategory(body).unwrap();
        toast.success(`${body.name} created`);
      }
      setFormOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the category"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deleteCategory(deleting.id).unwrap();
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not delete the category"));
    }
  };

  const quickAdd = async (name: string) => {
    try {
      await createCategory({ name, isActive: true }).unwrap();
      toast.success(`${name} created`);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not create the category"));
    }
  };

  const missing = SUGGESTIONS.filter(
    (name) => !categories.some((category) => category.name.toLowerCase() === name.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Kitchen Item Categories"
        subtitle="How your store list is grouped. These are separate from menu categories - Dairy is something you buy, not something you sell."
        actions={
          <Button size="lg" icon={<FiPlus />} hint="Ctrl+N" onClick={openNew}>
            Add Category
          </Button>
        }
      />

      {missing.length > 0 && (
        <Card className="mb-5 border-brand-200 bg-brand-50">
          <p className="mb-2 text-sm font-bold text-brand-800">Quick add the usual ones</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => quickAdd(name)}
                className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
              >
                <FiPlus className="mr-1 inline size-3" />
                {name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <p className="text-sm text-ink-500">Loading...</p>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FiLayers />}
            title="No kitchen categories yet"
            message="Group what you buy so the nightly closing sheet is easy to walk through."
            action={<Button onClick={openNew}>Add the first category</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <Card key={category.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink-900">{category.name}</p>
                <p className="text-sm text-ink-500">
                  {countFor(category.id)} item{countFor(category.id) === 1 ? "" : "s"}
                </p>
                {!category.isActive && (
                  <Badge tone="default" className="mt-1">
                    hidden
                  </Badge>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-0.5">
                <Button size="sm" variant="ghost" icon={<FiEdit2 />} onClick={() => openEdit(category)} />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<FiTrash2 />}
                  className="text-red-500 hover:bg-red-50"
                  onClick={() => setDeleting(category)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add a kitchen category"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button loading={creating || updating} onClick={save} disabled={!form.name.trim()}>
              {editing ? "Save changes" : "Add category"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Vegetables"
            autoFocus
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
        message={
          countFor(deleting?.id ?? 0) > 0
            ? `${deleting?.name} still has ${countFor(deleting?.id ?? 0)} items. Move or delete them first.`
            : "This category will be removed from the kitchen list."
        }
      />
    </div>
  );
};

export default KitchenCategories;
