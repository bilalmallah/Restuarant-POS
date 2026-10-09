import { useEffect, useMemo, useState } from "react";
import { FiSave, FiZap, FiTrendingUp } from "react-icons/fi";

import {
  useListEmployeesQuery,
  useGetCommissionFromSalesQuery,
  useSaveDailyCommissionsMutation,
  useListLedgerEntriesQuery,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { money, toDateInput, formatDate } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Badge, Button, Card, Input, Loader, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader from "../../components/layout/PageHeader";

/**
 * The close-of-night commission sheet.
 *
 * Commission from settled bills is already posted automatically, so this screen
 * shows what the sales actually earned alongside an editable column - the house
 * often pays a round figure, or adds something for a good night. "Fill from
 * sales" copies the calculated figures across in one tap.
 */
const DailyCommission = () => {
  const toast = useToast();

  const [date, setDate] = useState(() => toDateInput());
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const { data: employees = [], isLoading } = useListEmployeesQuery({ isActive: "true" });
  const { data: fromSales } = useGetCommissionFromSalesQuery({ from: date, to: date });
  const { data: posted = [] } = useListLedgerEntriesQuery({
    from: date,
    to: date,
    type: "commission",
  });

  const [saveCommissions, { isLoading: saving }] = useSaveDailyCommissionsMutation();

  const waiters = useMemo(() => employees.filter((employee) => employee.isWaiter), [employees]);

  const salesByEmployee = useMemo(
    () => new Map((fromSales?.rows ?? []).map((row) => [row.employeeId, row])),
    [fromSales]
  );

  const postedByEmployee = useMemo(() => {
    const map = new Map<number, number>();
    for (const entry of posted) {
      map.set(entry.employeeId, (map.get(entry.employeeId) ?? 0) + Number(entry.amount));
    }
    return map;
  }, [posted]);

  // Clear the draft column whenever the date changes, so yesterday's numbers
  // are never accidentally posted against today.
  useEffect(() => setAmounts({}), [date]);

  const fillFromSales = () => {
    const next: Record<number, string> = {};

    for (const waiter of waiters) {
      const earned = salesByEmployee.get(waiter.id)?.commission ?? 0;
      const already = postedByEmployee.get(waiter.id) ?? 0;
      const remaining = Math.max(earned - already, 0);

      if (remaining > 0) next[waiter.id] = String(remaining);
    }

    setAmounts(next);
    toast.info(
      Object.keys(next).length
        ? `Filled ${Object.keys(next).length} rows with what is not yet posted`
        : "Everything earned today is already posted"
    );
  };

  const entered = Object.values(amounts).reduce((sum, value) => sum + (Number(value) || 0), 0);

  const save = async () => {
    const rows = Object.entries(amounts)
      .map(([employeeId, amount]) => ({
        employeeId: Number(employeeId),
        amount: Number(amount) || 0,
        description: `Commission for ${date}`,
      }))
      .filter((row) => row.amount > 0);

    if (!rows.length) {
      toast.warning("Enter at least one amount first");
      return;
    }

    try {
      await saveCommissions({ entryDate: date, rows }).unwrap();
      toast.success(`${rows.length} commission entries saved`);
      setAmounts({});
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the commissions"));
    }
  };

  useHotkeys([{ combo: SHORTCUTS.save.combo, handler: save, allowInInput: true }], [amounts, date]);

  if (isLoading) return <Loader label="Loading the team" />;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Daily Commission"
        subtitle="Commission from settled bills posts automatically. Use this sheet to add or adjust what the house pays at close of night."
        actions={
          <>
            <Input
              type="date"
              value={date}
              max={toDateInput()}
              onChange={(event) => setDate(event.target.value)}
              wrapperClassName="w-44"
            />
            <Button variant="secondary" size="lg" icon={<FiZap />} onClick={fillFromSales}>
              Fill from sales
            </Button>
            <Button
              size="lg"
              icon={<FiSave />}
              hint="Ctrl+S"
              loading={saving}
              onClick={save}
              disabled={entered <= 0}
            >
              Save {entered > 0 ? money(entered) : ""}
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Sales on this day"
          value={money(fromSales?.totals.totalSales ?? 0)}
          sub={`${fromSales?.totals.orderCount ?? 0} bills`}
          tone="brand"
          icon={<FiTrendingUp />}
        />
        <StatTile
          label="Commission earned"
          value={money(fromSales?.totals.commission ?? 0)}
          sub="calculated from the bills"
        />
        <StatTile
          label="Already posted"
          value={money([...postedByEmployee.values()].reduce((sum, value) => sum + value, 0))}
          tone="success"
        />
        <StatTile
          label="Entering now"
          value={money(entered)}
          tone={entered > 0 ? "warning" : "default"}
        />
      </div>

      <Card padded={false} className="overflow-hidden">
        {waiters.length === 0 ? (
          <EmptyState
            title="No waiters on the team"
            message="Mark staff as waiters under Employees so they can take orders and earn commission."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-[11px] tracking-wider text-ink-500 uppercase">
                <tr>
                  <th className="px-3 py-2.5 text-left font-bold">Waiter</th>
                  <th className="px-3 py-2.5 text-right font-bold">Bills</th>
                  <th className="px-3 py-2.5 text-right font-bold">Sold</th>
                  <th className="px-3 py-2.5 text-right font-bold">Earned</th>
                  <th className="px-3 py-2.5 text-right font-bold">Already posted</th>
                  <th className="px-3 py-2.5 text-right font-bold">Add now</th>
                </tr>
              </thead>

              <tbody>
                {waiters.map((waiter) => {
                  const sales = salesByEmployee.get(waiter.id);
                  const already = postedByEmployee.get(waiter.id) ?? 0;

                  return (
                    <tr key={waiter.id} className="border-b border-ink-100 hover:bg-ink-50">
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-ink-900">{waiter.name}</span>
                        <span className="block text-xs text-ink-500">
                          {Number(waiter.commissionPercent)}% rate
                        </span>
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-ink-600">
                        {sales?.orderCount ?? 0}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-ink-700">
                        {money(sales?.totalSales ?? 0)}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-semibold text-brand-700">
                        {money(sales?.commission ?? 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {already > 0 ? (
                          <Badge tone="success">{money(already)}</Badge>
                        ) : (
                          <span className="text-xs text-ink-300">nothing yet</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={amounts[waiter.id] ?? ""}
                          onChange={(event) =>
                            setAmounts({ ...amounts, [waiter.id]: event.target.value })
                          }
                          onFocus={(event) => event.currentTarget.select()}
                          placeholder="0"
                          className="tabular h-9 w-28 rounded-lg border border-ink-300 px-2 text-right text-sm font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="border-t-2 border-ink-300 bg-ink-50 font-bold">
                <tr>
                  <td className="px-3 py-3" colSpan={5}>
                    Total being added for {formatDate(date)}
                  </td>
                  <td className="tabular px-3 py-3 text-right text-base text-brand-700">
                    {money(entered)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DailyCommission;
