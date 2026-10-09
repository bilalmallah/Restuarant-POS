import { useMemo, useRef, useState } from "react";
import { FiCoffee, FiAward } from "react-icons/fi";

import { useGetProductReportQuery } from "../../features/posApi";
import { usePrintPage } from "../../hooks/usePrint";
import useHotkeys from "../../hooks/useHotkeys";
import { SHORTCUTS } from "../../app/shortcuts";
import brand from "../../app/brand";
import { money, qty, formatDate, presetRange } from "../../utils/format";
import DataTable, { type Column } from "../../components/ui/DataTable";
import { Badge, Card, CardHeader, Loader, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader, { FilterBar, RangePicker, SelectFilter, PrintButton } from "../../components/layout/PageHeader";
import type { ProductReport as ProductReportData } from "../../types";

type ProductRow = ProductReportData["products"][number];

/**
 * "Which products did I sell between these dates, and how many?" - the question
 * the owner asks before deciding what to buy and what to take off the menu.
 */
const ProductReport = () => {
  const printPage = usePrintPage();
  const [range, setRange] = useState(() => presetRange("month"));
  const [search, setSearch] = useState("");
  const [categoryName, setCategoryName] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useGetProductReportQuery({
    from: range.from,
    to: range.to,
    search,
    categoryName,
  });

  useHotkeys([
    { combo: SHORTCUTS.print.combo, handler: printPage, allowInInput: true },
    { combo: SHORTCUTS.search.combo, handler: () => searchRef.current?.focus() },
  ]);

  const best = useMemo(
    () => ({
      byValue: data?.products[0],
      byQuantity: [...(data?.products ?? [])].sort((a, b) => b.quantity - a.quantity)[0],
    }),
    [data]
  );

  if (isLoading || !data) return <Loader label="Counting what sold" />;

  const { totals, byCategory, products } = data;

  const columns: Column<ProductRow>[] = [
    {
      key: "rank",
      header: "#",
      width: "44px",
      render: (_row, index) => <span className="tabular text-ink-400">{index + 1}</span>,
    },
    {
      key: "name",
      header: "Product",
      render: (row) => <span className="font-bold text-ink-900">{row.name}</span>,
    },
    {
      key: "category",
      header: "Category",
      hideOnMobile: true,
      render: (row) => <Badge tone="brand">{row.categoryName}</Badge>,
    },
    {
      key: "quantity",
      header: "Quantity sold",
      align: "right",
      render: (row) => (
        <span className="tabular text-base font-extrabold text-ink-900">{qty(row.quantity)}</span>
      ),
    },
    {
      key: "lines",
      header: "Times ordered",
      align: "right",
      hideOnMobile: true,
      render: (row) => <span className="tabular text-ink-500">{row.lineCount}</span>,
    },
    {
      key: "price",
      header: "Average price",
      align: "right",
      hideOnMobile: true,
      render: (row) => <span className="tabular text-ink-600">{money(row.averagePrice)}</span>,
    },
    {
      key: "amount",
      header: "Total value",
      align: "right",
      render: (row) => (
        <div>
          <span className="tabular font-extrabold text-brand-700">{money(row.amount)}</span>
          <span className="block text-[10px] text-ink-400">
            {((row.amount / (totals.amount || 1)) * 100).toFixed(1)}% of sales
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Product Report"
        subtitle="What sold between two dates, with quantities - grouped on the name as it was printed, so retired dishes still show up"
        actions={<PrintButton onClick={printPage} />}
      />

      <div className="print-only mb-4 border-b-2 border-black pb-2 text-center">
        <h1 className="text-xl font-black uppercase">{brand.name}</h1>
        <p className="text-sm font-bold">Product Sales Report</p>
        <p className="text-xs">
          {formatDate(range.from)} to {formatDate(range.to)}
        </p>
      </div>

      <RangePicker from={range.from} to={range.to} onChange={setRange} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Products Sold"
          value={totals.productCount}
          sub="different items"
          tone="brand"
          icon={<FiCoffee />}
        />
        <StatTile label="Total Quantity" value={qty(totals.quantity)} sub="units across all items" />
        <StatTile label="Total Value" value={money(totals.amount)} tone="success" />
        <StatTile
          label="Best Seller"
          value={best.byQuantity?.name ?? "-"}
          sub={best.byQuantity ? `${qty(best.byQuantity.quantity)} sold` : undefined}
          tone="warning"
          icon={<FiAward />}
        />
      </div>

      {byCategory.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="By category" subtitle="Where the money came from" />
          <div className="space-y-2">
            {byCategory.map((row) => {
              const share = (row.amount / (totals.amount || 1)) * 100;

              return (
                <div key={row.categoryName} className="flex items-center gap-2 sm:gap-3">
                  <span className="w-20 shrink-0 truncate text-xs font-bold text-ink-600 sm:w-28">
                    {row.categoryName}
                  </span>
                  <div className="h-5 min-w-0 flex-1 overflow-hidden rounded bg-ink-100">
                    <div
                      className="h-full rounded bg-brand-500"
                      style={{ width: `${Math.max(share, 2)}%` }}
                    />
                  </div>
                  {/*
                    Five fixed-width columns do not fit a phone. The quantity and
                    the share are the droppable ones - the bar already shows the
                    share, and the money is the number people came for.
                  */}
                  <span className="tabular hidden w-20 shrink-0 text-right text-xs text-ink-500 sm:block">
                    {qty(row.quantity)} units
                  </span>
                  <span className="tabular w-20 shrink-0 text-right text-sm font-bold text-ink-900 sm:w-28">
                    {money(row.amount)}
                  </span>
                  <span className="tabular hidden w-12 shrink-0 text-right text-xs text-ink-400 sm:block">
                    {share.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchRef={searchRef}
        placeholder="Search products  (Ctrl+K)"
      >
        <SelectFilter
          label="Category"
          value={categoryName}
          onChange={setCategoryName}
          allLabel="All categories"
          options={byCategory.map((row) => ({
            value: row.categoryName,
            label: row.categoryName,
          }))}
        />
      </FilterBar>

      <Card padded={false} className="print-sheet overflow-hidden">
        <DataTable
          rows={products}
          columns={columns}
          rowKey={(row) => `${row.categoryName}:${row.name}`}
          dense
          empty={
            <EmptyState
              icon={<FiCoffee />}
              title="Nothing sold in this period"
              message="Try a wider date range."
            />
          }
          footer={
            <tr>
              <td className="px-3 py-3" colSpan={3}>
                Totals — {products.length} products
              </td>
              <td className="tabular px-3 py-3 text-right text-base">{qty(totals.quantity)}</td>
              <td className="hidden sm:table-cell" />
              <td className="hidden sm:table-cell" />
              <td className="tabular px-3 py-3 text-right text-base">{money(totals.amount)}</td>
            </tr>
          }
        />
      </Card>
    </div>
  );
};

export default ProductReport;
