import { useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiLayers } from "react-icons/fi";

import {
  useListCategoriesQuery,
  useListProductsQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { Badge, Button, Card, Input, Switch, EmptyState } from "../../components/ui/primitives";
import PageHeader from "../../components/layout/PageHeader";
import type { Category } from "../../types";

/** Chosen to stay legible as a white-on-colour chip on the order screen. */
const PALETTE = [
  "#b45309", "#0e7490", "#b91c1c", "#15803d", "#a16207",
  "#1d4ed8", "#6d28d9", "#be185d", "#0f766e", "#475569",
];

const Categories = () => {
  const toast = useToast();

  const { data: categories = [], isLoading } = useListCategoriesQuery();
  const { data: products = [] } = useListProductsQuery();

  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: deletingNow }] = useDeleteCategoryMutation();

  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", colour: PALETTE[0], isActive: true });

  const countFor = (id: number) => products.filter((product) => product.categoryId === id).length;

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", colour: PALETTE[categories.length % PALETTE.length], isActive: true });
    setFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({ name: category.name, colour: category.colour, isActive: category.isActive });
    setFormOpen(true);
  };

  useHotkeys([{ combo: SHORTCUTS.addNew.combo, handler: openNew }]);

  const save = async () => {
    const body = { name: form.name.trim(), colour: form.colour, isActive: form.isActive };

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

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Menu Categories"
        subtitle="The tabs across the top of the order screen. Colour makes them quick to find during a rush."
        actions={
          <Button size="lg" icon={<FiPlus />} hint="Ctrl+N" onClick={openNew}>
            Add Category
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <p className="text-sm text-ink-500">Loading...</p>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FiLayers />}
            title="No categories yet"
            message="Group your menu into categories like BBQ, Karahi and Cold Drinks."
            action={<Button onClick={openNew}>Add the first category</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => {
            const count = countFor(category.id);

            return (
              <Card key={category.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span
                    className="mb-2 inline-block rounded-md px-2.5 py-1 text-sm font-bold text-white"
                    style={{ backgroundColor: category.colour }}
                  >
                    {category.name}
                  </span>
                  <p className="text-sm text-ink-600">
                    {count} product{count === 1 ? "" : "s"}
                  </p>
                  {!category.isActive && (
                    <Badge tone="default" className="mt-1">
                      hidden from the till
                    </Badge>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-1">
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
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add a category"}
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
            placeholder="BBQ"
            autoFocus
          />

          <div>
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-600 uppercase">
              Colour
            </span>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  onClick={() => setForm({ ...form, colour })}
                  style={{ backgroundColor: colour }}
                  aria-label={colour}
                  className={`size-9 rounded-lg transition-transform ${
                    form.colour === colour
                      ? "scale-110 ring-2 ring-ink-900 ring-offset-2"
                      : "hover:scale-105"
                  }`}
                />
              ))}
            </div>
          </div>

          <Switch
            label="Show on the till"
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
            ? `${deleting?.name} still has ${countFor(deleting?.id ?? 0)} products. Move or delete them first.`
            : "This category will be removed from the order screen."
        }
      />
    </div>
  );
};

export default Categories;
