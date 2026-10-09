import { useMemo, useRef, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiEyeOff, FiEye, FiTag } from "react-icons/fi";

import {
  useListProductsQuery,
  useListCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useToggleProductMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { money } from "../../utils/format";
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
import type { Product } from "../../types";

const emptyProduct = {
  name: "",
  description: "",
  variantLabel: "",
  code: "",
  categoryId: "",
  price: "",
  printToKitchen: true,
  commissionPercent: "",
  isActive: true,
};

type FormState = typeof emptyProduct;

const Products = () => {
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyProduct);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useListProductsQuery({ search, categoryId });
  const { data: categories = [] } = useListCategoriesQuery({ isActive: "true" });

  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: deletingNow }] = useDeleteProductMutation();
  const [toggleProduct] = useToggleProductMutation();

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyProduct, categoryId: categories[0]?.id ? String(categories[0].id) : "" });
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      variantLabel: product.variantLabel ?? "",
      code: product.code ?? "",
      categoryId: String(product.categoryId),
      price: String(Number(product.price)),
      printToKitchen: product.printToKitchen,
      commissionPercent:
        product.commissionPercent === null ? "" : String(Number(product.commissionPercent)),
      isActive: product.isActive,
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
      description: form.description.trim() || null,
      variantLabel: form.variantLabel.trim() || null,
      code: form.code.trim() || null,
      categoryId: Number(form.categoryId),
      price: Number(form.price) || 0,
      printToKitchen: form.printToKitchen,
      commissionPercent: form.commissionPercent === "" ? null : Number(form.commissionPercent),
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await updateProduct({ id: editing.id, body }).unwrap();
        toast.success(`${body.name} updated`);
      } else {
        await createProduct(body).unwrap();
        toast.success(`${body.name} added to the menu`);
      }
      setFormOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the product"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deleteProduct(deleting.id).unwrap();
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not delete the product"));
    }
  };

  const stats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((product) => product.isActive).length,
      value: products.reduce((sum, product) => sum + Number(product.price), 0),
      noToken: products.filter((product) => !product.printToKitchen).length,
    }),
    [products]
  );

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      render: (product) => (
        <div>
          <span className="font-bold text-ink-900">{product.name}</span>
          {product.variantLabel && (
            <Badge tone="warning" className="ml-2">
              {product.variantLabel}
            </Badge>
          )}
          {product.code && <span className="ml-2 text-xs text-ink-400">#{product.code}</span>}
          {!product.isActive && (
            <Badge tone="default" className="ml-2">
              hidden
            </Badge>
          )}
          {product.description && (
            <span className="mt-0.5 line-clamp-1 block text-xs text-ink-500">
              {product.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      hideOnMobile: true,
      render: (product) =>
        product.category ? (
          <span
            className="inline-block rounded px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: product.category.colour }}
          >
            {product.category.name}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      render: (product) => (
        <span className="tabular font-bold text-ink-900">{money(product.price)}</span>
      ),
    },
    {
      key: "kitchen",
      header: "Kitchen token",
      align: "center",
      hideOnMobile: true,
      render: (product) =>
        product.printToKitchen ? (
          <Badge tone="success">prints</Badge>
        ) : (
          <Badge tone="info">no token</Badge>
        ),
    },
    {
      key: "commission",
      header: "Commission",
      align: "right",
      hideOnMobile: true,
      render: (product) =>
        product.commissionPercent === null ? (
          <span className="text-xs text-ink-400">house rate</span>
        ) : (
          <span className="tabular">{Number(product.commissionPercent)}%</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "140px",
      render: (product) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={product.isActive ? <FiEyeOff /> : <FiEye />}
            title={product.isActive ? "Hide from the till" : "Show on the till"}
            onClick={() => toggleProduct(product.id)}
          />
          <Button size="sm" variant="ghost" icon={<FiEdit2 />} onClick={() => openEdit(product)} />
          <Button
            size="sm"
            variant="ghost"
            icon={<FiTrash2 />}
            className="text-red-500 hover:bg-red-50"
            onClick={() => setDeleting(product)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Products"
        subtitle="What appears on the till. Prices here are the starting point - the cashier can still override one on a single bill."
        actions={
          <Button size="lg" icon={<FiPlus />} hint="Ctrl+N" onClick={openNew}>
            Add Product
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Products" value={stats.total} tone="brand" />
        <StatTile label="On the till" value={stats.active} sub={`${stats.total - stats.active} hidden`} />
        <StatTile label="Categories" value={categories.length} />
        <StatTile label="Skip kitchen token" value={stats.noToken} sub="drinks and bought-in items" />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchRef={searchRef}
        placeholder="Search products by name or code  (Ctrl+K)"
      >
        <SelectFilter
          label="Category"
          value={categoryId}
          onChange={setCategoryId}
          allLabel="All categories"
          options={categories.map((category) => ({
            value: String(category.id),
            label: category.name,
          }))}
        />
      </FilterBar>

      <Card padded={false} className="overflow-hidden">
        <DataTable
          rows={products}
          columns={columns}
          rowKey={(product) => product.id}
          loading={isLoading}
          empty={
            <EmptyState
              icon={<FiTag />}
              title={search ? `No product matches "${search}"` : "No products yet"}
              message="Add your dishes so they appear on the order screen."
              action={<Button onClick={openNew}>Add the first product</Button>}
            />
          }
        />
      </Card>

      {/* ---------------- Form ---------------- */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add a product"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={creating || updating}
              onClick={save}
              disabled={!form.name.trim() || !form.categoryId || form.price === ""}
            >
              {editing ? "Save changes" : "Add product"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Product name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Chicken Karahi (Half)"
            autoFocus
          />

          <Textarea
            label="What is in it"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Secret sauce, chicken, green capsicum, onion, cheese"
            hint="Shown on the till so staff can answer without asking the kitchen"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Category"
              required
              value={form.categoryId}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
            >
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            <MoneyInput
              label="Price"
              required
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Size / variant"
              value={form.variantLabel}
              onChange={(event) => setForm({ ...form, variantLabel: event.target.value })}
              placeholder="Small, Medium, Large - blank for most items"
              hint="Printed on the kitchen token and the bill"
            />
            <Input
              label="Short code"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="Optional, for quick search"
            />
            <Input
              label="Commission %"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.commissionPercent}
              onChange={(event) => setForm({ ...form, commissionPercent: event.target.value })}
              placeholder="Leave blank for house rate"
              hint="Overrides the waiter's usual rate for this item"
            />
          </div>

          <Switch
            label="Print on the kitchen token"
            hint="Turn this off for cold drinks and anything not cooked in your kitchen"
            checked={form.printToKitchen}
            onChange={(printToKitchen) => setForm({ ...form, printToKitchen })}
          />

          <Switch
            label="Show on the till"
            hint="Hide instead of deleting to keep old bills and reports intact"
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
          <>
            This removes the product from the menu permanently. Past bills keep their own copy of
            the name and price, so your reports are safe - but if you only want it off the till,
            <strong> hide it instead</strong>.
          </>
        }
      />
    </div>
  );
};

export default Products;
