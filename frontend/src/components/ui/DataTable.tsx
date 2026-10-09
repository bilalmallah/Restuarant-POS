import type { ReactNode } from "react";
import clsx from "clsx";
import { Loader, EmptyState } from "./primitives";

export type Column<T> = {
  key: string;
  header: ReactNode;
  /** Right-align money, centre badges, left everything else. */
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
  render: (row: T, index: number) => ReactNode;
  /** Hidden below `sm` - used to keep phone-width tables readable. */
  hideOnMobile?: boolean;
};

/**
 * One table for every list in the app.
 *
 * It deliberately does not paginate: a restaurant's product list, staff list
 * and credit book are all small enough to scroll, and pagination is one more
 * thing to get lost in when you are looking for one row.
 */
export const DataTable = <T,>({
  rows,
  columns,
  rowKey,
  loading,
  empty,
  onRowClick,
  footer,
  dense,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
  dense?: boolean;
}) => {
  if (loading) return <Loader />;

  if (!rows.length) {
    return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  }

  const alignment = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  } as const;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-ink-200 bg-ink-50 text-[11px] tracking-wider text-ink-500 uppercase">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                className={clsx(
                  "px-3 py-2.5 font-bold",
                  alignment[column.align ?? "left"],
                  column.hideOnMobile && "hidden sm:table-cell"
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                "border-b border-ink-100 transition-colors last:border-0",
                onRowClick && "cursor-pointer hover:bg-brand-50/60",
                !onRowClick && "hover:bg-ink-50"
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={clsx(
                    "px-3",
                    dense ? "py-1.5" : "py-2.5",
                    alignment[column.align ?? "left"],
                    column.hideOnMobile && "hidden sm:table-cell",
                    column.className
                  )}
                >
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        {footer && (
          <tfoot className="border-t-2 border-ink-300 bg-ink-50 font-bold">{footer}</tfoot>
        )}
      </table>
    </div>
  );
};

export default DataTable;
