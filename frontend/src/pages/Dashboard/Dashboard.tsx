import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiShoppingBag,
  FiDollarSign,
  FiBookOpen,
  FiUsers,
  FiTrendingUp,
  FiArrowRight,
  FiClock,
} from "react-icons/fi";

import { useGetDashboardQuery } from "../../features/posApi";
import { useAuth } from "../../hooks/useStore";
import { money, formatDate, elapsedSince } from "../../utils/format";
import { Card, CardHeader, Loader, StatTile, EmptyState, Badge, Button } from "../../components/ui/primitives";
import PageHeader from "../../components/layout/PageHeader";

const Dashboard = () => {
  const { user } = useAuth();
  const { data, isLoading } = useGetDashboardQuery(undefined, { pollingInterval: 60_000 });

  if (isLoading || !data) return <Loader label="Loading today" />;

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  const chartData = data.trend.map((point) => ({
    ...point,
    label: new Date(point.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
  }));

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={`${greeting}, ${user?.name?.split(" ")[0] ?? "there"}`}
        subtitle={`Here is how ${formatDate(data.date)} is going`}
        actions={
          <Button
            size="lg"
            variant="accent"
            icon={<FiShoppingBag />}
            // A separate tab, stripped of the sidebar: during service the till
            // should not be one stray tap away from the payroll screen.
            onClick={() => window.open("/pos?focus=1", "_blank", "noopener")}
          >
            Open the floor
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Today's Sales"
          value={money(data.today.sales)}
          sub={`${data.today.orderCount} bills`}
          tone="brand"
          icon={<FiTrendingUp />}
        />
        <StatTile
          label="Cash Received"
          value={money(data.today.cashReceived)}
          sub={`Average bill ${money(data.today.averageBill)}`}
          tone="success"
          icon={<FiDollarSign />}
        />
        <StatTile
          label="Today's Expenses"
          value={money(data.today.expenses)}
          sub={`In hand ${money(data.today.netInHand)}`}
          tone={data.today.expenses > 0 ? "warning" : "default"}
        />
        <StatTile
          label="Outstanding Credit"
          value={money(data.outstandingCredit)}
          sub="Across all khata accounts"
          tone={data.outstandingCredit > 0 ? "danger" : "default"}
          icon={<FiBookOpen />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Last 14 days"
            subtitle="Sales settled per day, including credit sales"
            actions={
              <Link to="/reports/sales" className="text-sm font-bold text-brand-600 hover:underline">
                Full report
              </Link>
            }
          />

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#108566" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#108566" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : String(value))}
                />
                <Tooltip
                  formatter={(value) => [money(Number(value ?? 0)), "Sales"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#108566"
                  strokeWidth={2.5}
                  fill="url(#salesFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Running now"
            subtitle={`${data.openOrders.length} open bill${data.openOrders.length === 1 ? "" : "s"}`}
            actions={
              <Link to="/pos" className="text-sm font-bold text-brand-600 hover:underline">
                Floor
              </Link>
            }
          />

          {data.openOrders.length === 0 ? (
            <EmptyState
              icon={<FiUsers />}
              title="No tables running"
              message="Every bill has been settled."
            />
          ) : (
            <ul className="-mx-1 max-h-64 space-y-1 overflow-y-auto">
              {data.openOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/pos/order/${order.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-ink-50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-extrabold text-brand-700">
                      {order.tableName ?? "TA"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink-800">
                        #{order.orderNumber}
                        {order.waiterName ? ` · ${order.waiterName}` : ""}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-ink-500">
                        <FiClock className="size-3" />
                        {elapsedSince(order.openedAt)}
                        {order.status === "billed" && <Badge tone="info">billed</Badge>}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-sm font-extrabold text-ink-900">
                      {money(order.total)}
                    </span>
                    <FiArrowRight className="size-4 shrink-0 text-ink-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/pos", label: "Take an order", hint: "Floor plan", icon: FiShoppingBag },
          { to: "/credit", label: "Credit book", hint: "Who owes what", icon: FiBookOpen },
          { to: "/expenses", label: "Add an expense", hint: "Today's spending", icon: FiDollarSign },
          { to: "/kitchen/closing", label: "Closing checklist", hint: "Tomorrow's list", icon: FiUsers },
        ].map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-ink-800">{link.label}</span>
                <span className="block truncate text-xs text-ink-500">{link.hint}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
