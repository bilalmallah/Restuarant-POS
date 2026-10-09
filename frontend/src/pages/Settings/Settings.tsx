import { useEffect, useState } from "react";
import { FiSave, FiInfo, FiLock, FiPrinter, FiAlertTriangle, FiRefreshCw, FiCheckCircle } from "react-icons/fi";

import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useChangeMyPasswordMutation,
  useListPrintersQuery,
  useSendToPrinterMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import brand from "../../app/brand";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  Select,
  Switch,
  Loader,
} from "../../components/ui/primitives";
import PageHeader from "../../components/layout/PageHeader";
import ReceiptLayout from "./ReceiptLayout";
import Backups from "./Backups";

const Settings = () => {
  const toast = useToast();

  const { data, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();
  const [changePassword, { isLoading: changing }] = useChangeMyPasswordMutation();

  const {
    data: printerList,
    isFetching: loadingPrinters,
    refetch: refetchPrinters,
  } = useListPrintersQuery();
  const [sendToPrinter, { isLoading: testing }] = useSendToPrinterMutation();

  const [form, setForm] = useState({
    taxPercent: "0",
    serviceChargePercent: "0",
    defaultCommissionPercent: "0",
    printTokenOnSave: true,

    /* Receipt layout */
    receiptWidth: "80mm",
    receiptHeaderText: "",
    receiptFooter: "",
    showAddressOnReceipt: true,
    showPhoneOnReceipt: true,
    showWaiterOnReceipt: true,
    showGuestsOnReceipt: true,
    showRateColumn: true,
    showTaxOnReceipt: false,
    showFooterNote: true,
    showPrintedAt: true,
    receiptFontScale: "normal",
    receiptCopies: "1",
    receiptFeedLines: "3",
    silentPrint: false,
    receiptPrinterName: "",
    kitchenPrinterName: "",
  });

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  useEffect(() => {
    if (!data) return;

    setForm({
      taxPercent: data.settings.taxPercent,
      serviceChargePercent: data.settings.serviceChargePercent,
      defaultCommissionPercent: data.settings.defaultCommissionPercent,
      printTokenOnSave: data.settings.printTokenOnSave === "true",

      receiptWidth: data.settings.receiptWidth,
      receiptHeaderText: data.settings.receiptHeaderText ?? "",
      receiptFooter: data.settings.receiptFooter ?? "",
      showAddressOnReceipt: data.settings.showAddressOnReceipt !== "false",
      showPhoneOnReceipt: data.settings.showPhoneOnReceipt !== "false",
      showWaiterOnReceipt: data.settings.showWaiterOnReceipt !== "false",
      showGuestsOnReceipt: data.settings.showGuestsOnReceipt !== "false",
      showRateColumn: data.settings.showRateColumn !== "false",
      showTaxOnReceipt: data.settings.showTaxOnReceipt === "true",
      showFooterNote: data.settings.showFooterNote !== "false",
      showPrintedAt: data.settings.showPrintedAt !== "false",
      receiptFontScale: data.settings.receiptFontScale || "normal",
      receiptCopies: data.settings.receiptCopies || "1",
      receiptFeedLines: data.settings.receiptFeedLines || "3",
      silentPrint: data.settings.silentPrint === "true",
      receiptPrinterName: data.settings.receiptPrinterName ?? "",
      kitchenPrinterName: data.settings.kitchenPrinterName ?? "",
    });
  }, [data]);

  const save = async () => {
    try {
      await updateSettings({
        taxPercent: Number(form.taxPercent) || 0,
        serviceChargePercent: Number(form.serviceChargePercent) || 0,
        defaultCommissionPercent: Number(form.defaultCommissionPercent) || 0,
        printTokenOnSave: form.printTokenOnSave,

        receiptWidth: form.receiptWidth,
        receiptHeaderText: form.receiptHeaderText,
        receiptFooter: form.receiptFooter,
        showAddressOnReceipt: form.showAddressOnReceipt,
        showPhoneOnReceipt: form.showPhoneOnReceipt,
        showWaiterOnReceipt: form.showWaiterOnReceipt,
        showGuestsOnReceipt: form.showGuestsOnReceipt,
        showRateColumn: form.showRateColumn,
        showTaxOnReceipt: form.showTaxOnReceipt,
        showFooterNote: form.showFooterNote,
        showPrintedAt: form.showPrintedAt,
        receiptFontScale: form.receiptFontScale,
        receiptCopies: Number(form.receiptCopies) || 1,
        receiptFeedLines: Number(form.receiptFeedLines) || 0,
        silentPrint: form.silentPrint,
        receiptPrinterName: form.receiptPrinterName,
        kitchenPrinterName: form.kitchenPrinterName,
      }).unwrap();

      toast.success("Settings saved");
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the settings"));
    }
  };

  const savePassword = async () => {
    if (passwords.newPassword !== passwords.confirm) {
      toast.error("The two new passwords do not match");
      return;
    }

    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }).unwrap();

      toast.success("Password changed");
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not change the password"));
    }
  };

  useHotkeys([{ combo: SHORTCUTS.save.combo, handler: save, allowInInput: true }], [form]);

  if (isLoading) return <Loader label="Loading settings" />;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Settings"
        subtitle="Defaults for new bills, how receipts print, and your own password"
        actions={
          <Button size="lg" icon={<FiSave />} hint="Ctrl+S" loading={saving} onClick={save}>
            Save Settings
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------------- Branding ---------------- */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Restaurant identity"
            subtitle="These come from the single .env file at the root of the project"
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Name", brand.name, "APP_NAME"],
              ["Tagline", brand.tagline, "APP_TAGLINE"],
              ["Currency", brand.currency, "APP_CURRENCY"],
              ["Phone", brand.phone || "not set", "APP_PHONE"],
              ["Address", brand.address || "not set", "APP_ADDRESS"],
              ["Receipt footer", brand.footerNote || "not set", "APP_FOOTER_NOTE"],
            ].map(([label, value, key]) => (
              <div key={key} className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
                <p className="text-[11px] font-bold tracking-wider text-ink-500 uppercase">{label}</p>
                <p className="truncate font-semibold text-ink-900">{value}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-400">{key}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            <FiInfo className="mt-0.5 size-4 shrink-0" />
            <span>
              Change <code className="font-mono font-bold">APP_NAME</code> in the{" "}
              <code className="font-mono font-bold">.env</code> file at the project root and restart
              - the login screen, sidebar, browser tab, every receipt and every printed report all
              follow from that one line. Nothing else needs editing.
            </span>
          </p>
        </Card>

        {/* ---------------- Billing defaults ---------------- */}
        <Card>
          <CardHeader
            title="Billing defaults"
            subtitle="Applied to every new bill. Individual bills can still be changed at the till."
          />

          <div className="space-y-3">
            <Input
              label="Tax percent"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.taxPercent}
              onChange={(event) => setForm({ ...form, taxPercent: event.target.value })}
              hint="Calculated after the discount, never before"
            />

            <Input
              label="Service charge percent"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.serviceChargePercent}
              onChange={(event) => setForm({ ...form, serviceChargePercent: event.target.value })}
            />

            <Input
              label="House commission percent"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.defaultCommissionPercent}
              onChange={(event) =>
                setForm({ ...form, defaultCommissionPercent: event.target.value })
              }
              hint="Used when a waiter has no rate of their own"
            />
          </div>
        </Card>

        {/* ---------------- Receipt layout ---------------- */}
        <ReceiptLayout form={form} onChange={(next) => setForm({ ...form, ...next })} />

        {/* ---------------- Kitchen token ---------------- */}
        <Card className="lg:col-span-2">
          <CardHeader title="Kitchen token" subtitle="The slip the kitchen cooks from" />
          <Switch
            label="Remind to print the kitchen token"
            hint="Highlights the Token button when items have not been sent to the kitchen"
            checked={form.printTokenOnSave}
            onChange={(printTokenOnSave) => setForm({ ...form, printTokenOnSave })}
          />
        </Card>

        {/* ---------------- Direct printing ---------------- */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <FiPrinter className="size-4" /> Direct printing
              </span>
            }
            subtitle="Send bills and tokens straight to a printer, with no browser dialog"
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={<FiRefreshCw />}
                loading={loadingPrinters}
                onClick={() => refetchPrinters()}
              >
                Refresh printers
              </Button>
            }
          />

          {printerList && !printerList.supported ? (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <FiAlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{printerList.reason}</span>
            </p>
          ) : (
            <div className="space-y-4">
              <Switch
                label="Print without asking"
                hint="On: bills and tokens go straight to the printers below. Off: the browser print dialog opens every time."
                checked={form.silentPrint}
                onChange={(silentPrint) => setForm({ ...form, silentPrint })}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["receiptPrinterName", "Receipt printer", "Bills and customer receipts"],
                    ["kitchenPrinterName", "Kitchen printer", "Kitchen tokens and the purchase list"],
                  ] as const
                ).map(([key, label, hint]) => {
                  const chosen = printerList?.printers.find((p) => p.name === form[key]);

                  return (
                    <div key={key}>
                      <Select
                        label={label}
                        value={form[key]}
                        onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                        hint={hint}
                        disabled={!form.silentPrint}
                      >
                        <option value="">Not set</option>
                        {printerList?.printers.map((printer) => (
                          <option key={printer.name} value={printer.name}>
                            {printer.name}
                            {printer.offline ? "  (offline)" : ""}
                          </option>
                        ))}
                      </Select>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {chosen && (
                          <Badge tone={chosen.offline ? "danger" : "success"}>
                            {chosen.offline ? "offline" : "ready"}
                          </Badge>
                        )}
                        {chosen?.port && (
                          <span className="text-[11px] text-ink-400">on {chosen.port}</span>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<FiCheckCircle />}
                          loading={testing}
                          disabled={!form[key]}
                          onClick={async () => {
                            try {
                              const result = await sendToPrinter({
                                target: key === "kitchenPrinterName" ? "kitchen" : "receipt",
                                printerName: form[key],
                                label: "Test page",
                                text: [
                                  brand.name.toUpperCase(),
                                  "",
                                  `${label} test page`,
                                  new Date().toLocaleString("en-GB"),
                                  "",
                                  "If you can read this, printing works.",
                                ].join("\n"),
                              }).unwrap();
                              toast.success(result.message);
                            } catch (caught) {
                              toast.error(errorMessage(caught, "The printer did not accept the job"));
                            }
                          }}
                        >
                          Test print
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                <FiInfo className="mt-0.5 size-4 shrink-0" />
                <span>
                  Printing happens on the computer running the API, which is why no dialog appears
                  and why an unplugged printer produces a real error instead of a stuck job. Use
                  <strong> Test print</strong> after changing anything.
                </span>
              </p>
            </div>
          )}
        </Card>

        {/* ---------------- Backups ---------------- */}
        <Backups />

        {/* ---------------- Password ---------------- */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <FiLock className="size-4" /> Change your password
              </span>
            }
            subtitle="Only changes your own login, not anyone else's"
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(event) =>
                setPasswords({ ...passwords, currentPassword: event.target.value })
              }
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
              hint="At least 6 characters"
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
              error={
                passwords.confirm && passwords.confirm !== passwords.newPassword
                  ? "Passwords do not match"
                  : undefined
              }
            />
          </div>

          <Button
            className="mt-3"
            variant="secondary"
            loading={changing}
            onClick={savePassword}
            disabled={
              !passwords.currentPassword ||
              passwords.newPassword.length < 6 ||
              passwords.newPassword !== passwords.confirm
            }
          >
            Change password
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
