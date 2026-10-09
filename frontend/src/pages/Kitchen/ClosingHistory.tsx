import { useState } from "react";
import { FiPrinter, FiTrash2, FiArchive, FiEye } from "react-icons/fi";

import {
  useListClosingsQuery,
  useGetShoppingListQuery,
  useDeleteClosingMutation,
} from "../../features/posApi";
import { useCan } from "../../hooks/useStore";
import usePrinter from "../../hooks/usePrinter";
import { formatDate, presetRange } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { ConfirmDialog } from "../../components/ui/Modal";
import DataTable, { type Column } from "../../components/ui/DataTable";
import { Badge, Button, Card, EmptyState } from "../../components/ui/primitives";
import PageHeader, { RangePicker } from "../../components/layout/PageHeader";
import { ShoppingListDocument } from "../../components/print/Receipt";
import PrintPortal from "../../components/print/PrintPortal";
import type { Closing } from "../../types";

const ClosingHistory = () => {
  const toast = useToast();
  const { isManager } = useCan();

  const [range, setRange] = useState(() => presetRange("month"));
  const [printId, setPrintId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Closing | null>(null);

  const { data: closings = [], isLoading } = useListClosingsQuery({
    from: range.from,
    to: range.to,
  });

  // Fetched only once a row's print button is pressed.
  const { data: list } = useGetShoppingListQuery(printId!, { skip: !printId });
  const [deleteClosing, { isLoading: deletingNow }] = useDeleteClosingMutation();

  const printer = usePrinter();

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deleteClosing(deleting.id).unwrap();
      toast.success("Closing sheet deleted");
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not delete the sheet"));
    }
  };

  const columns: Column<Closing>[] = [
    {
      key: "date",
      header: "Date",
      render: (closing) => (
        <span className="font-bold text-ink-900">{formatDate(closing.businessDate)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (closing) => (
        <Badge tone={closing.status === "completed" ? "success" : "warning"}>
          {closing.status === "completed" ? "Completed" : "Draft"}
        </Badge>
      ),
    },
    {
      key: "checkedBy",
      header: "Checked by",
      hideOnMobile: true,
      render: (closing) => closing.checkedByName ?? "-",
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      render: (closing) => <span className="tabular">{closing.stats?.total ?? 0}</span>,
    },
    {
      key: "issues",
      header: "Issues",
      align: "center",
      render: (closing) => {
        const low = closing.stats?.low ?? 0;
        const out = closing.stats?.out ?? 0;

        if (!low && !out) return <span className="text-xs text-ink-400">all in stock</span>;

        return (
          <span className="flex justify-center gap-1">
            {out > 0 && <Badge tone="danger">{out} finished</Badge>}
            {low > 0 && <Badge tone="warning">{low} low</Badge>}
          </span>
        );
      },
    },
    {
      key: "toBuy",
      header: "To buy",
      align: "right",
      render: (closing) => (
        <span className="tabular font-bold text-brand-700">{closing.stats?.demand ?? 0}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "130px",
      render: (closing) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={<FiEye />}
            title="Open this sheet"
            onClick={() =>
              window.location.assign(`/kitchen/closing?date=${closing.businessDate}`)
            }
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<FiPrinter />}
            title="Print the purchase list"
            onClick={() => setPrintId(closing.id)}
          />
          {isManager && (
            <Button
              size="sm"
              variant="ghost"
              icon={<FiTrash2 />}
              className="text-red-500 hover:bg-red-50"
              onClick={() => setDeleting(closing)}
            />
          )}
        </div>
      ),
    },
  ];

  // Once the requested list arrives, hand it to the printer.
  if (printId && list && printer.listDocument?.closingId !== printId) {
    void printer.printShoppingList(list);
    setPrintId(null);
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Closing History"
        subtitle="Every night's store check, with the purchase list it produced"
      />

      <RangePicker from={range.from} to={range.to} onChange={setRange} />

      <Card padded={false} className="overflow-hidden">
        <DataTable
          rows={closings}
          columns={columns}
          rowKey={(closing) => closing.id}
          loading={isLoading}
          empty={
            <EmptyState
              icon={<FiArchive />}
              title="No closing sheets in this period"
              message="Sheets appear here once the kitchen starts closing each night."
            />
          }
        />
      </Card>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingNow}
        title={`Delete the sheet for ${deleting ? formatDate(deleting.businessDate) : ""}?`}
        message="The whole night's stock check and purchase list will be removed. This cannot be undone."
      />

      <PrintPortal>
        {printer.listDocument && <ShoppingListDocument list={printer.listDocument} />}
      </PrintPortal>
    </div>
  );
};

export default ClosingHistory;
