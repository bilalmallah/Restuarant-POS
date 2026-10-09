import { FiDatabase, FiDownload, FiAlertTriangle, FiCheckCircle, FiHardDrive } from "react-icons/fi";

import {
  useGetBackupStatusQuery,
  useListBackupsQuery,
  useCreateBackupMutation,
} from "../../features/posApi";
import { formatDateTime } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../hooks/useStore";
import { useAppSelector } from "../../hooks/useStore";
import { Badge, Button, Card, CardHeader, EmptyState } from "../../components/ui/primitives";

const sizeLabel = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

/**
 * Backups, and proof that they are happening.
 *
 * The status line matters more than the button: a backup nobody has looked at
 * is a backup nobody knows is broken. "Back up now" exists so you can find out
 * it works before the day you need it.
 */
export const Backups = () => {
  const toast = useToast();
  const { user } = useAuth();
  const token = useAppSelector((state) => state.auth.token);
  const isAdmin = user?.role === "admin";

  const { data: status } = useGetBackupStatusQuery(undefined, { skip: !isAdmin });
  const { data: files = [] } = useListBackupsQuery(undefined, { skip: !isAdmin });
  const [createBackup, { isLoading }] = useCreateBackupMutation();

  if (!isAdmin) return null;

  /**
   * A plain <a href> cannot carry the bearer token, so the endpoint would just
   * answer 401. Fetch it with the header, then hand the browser a blob to save.
   */
  const download = async (name: string) => {
    try {
      const response = await fetch(`/api/backups/${encodeURIComponent(name)}`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error(`The server refused the download (${response.status})`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not download that backup"));
    }
  };

  const runNow = async () => {
    try {
      const result = await createBackup().unwrap();
      toast.success(result.message);
    } catch (caught) {
      toast.error(errorMessage(caught, "The backup did not run"));
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <FiDatabase className="size-4" /> Backups
          </span>
        }
        subtitle="A full copy of the database, written automatically"
        actions={
          <Button icon={<FiHardDrive />} loading={isLoading} onClick={runNow}>
            Back up now
          </Button>
        }
      />

      {!status?.enabled ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <FiAlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Automatic backups are switched off. Set <code className="font-mono">ENABLE_BACKUPS="true"</code>{" "}
            in the <code className="font-mono">.env</code> file and restart to turn them on.
          </span>
        </p>
      ) : (
        <div className="space-y-4">
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              status.latest
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {status.latest ? (
              <FiCheckCircle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <FiAlertTriangle className="mt-0.5 size-4 shrink-0" />
            )}
            <span>
              {status.latest ? (
                <>
                  Last backup <strong>{formatDateTime(status.latest.createdAt)}</strong> (
                  {sizeLabel(status.latest.sizeBytes)}). Next one due{" "}
                  <strong>{formatDateTime(status.dueAt)}</strong>.
                </>
              ) : (
                <>No backup has been taken yet. Press <strong>Back up now</strong> to make the first one.</>
              )}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Every", `${status.intervalDays} days`],
              ["Keeping", `${status.keep} most recent`],
              ["On disk", `${status.count} file${status.count === 1 ? "" : "s"}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
                <p className="text-[11px] font-bold tracking-wider text-ink-500 uppercase">{label}</p>
                <p className="font-semibold text-ink-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
            <p className="text-[11px] font-bold tracking-wider text-ink-500 uppercase">Saved in</p>
            <p className="font-mono text-xs break-all text-ink-800">{status.directory}</p>
            <p className="mt-1 text-xs text-ink-500">
              Point <code className="font-mono">BACKUP_DIR</code> at a synced folder or an external
              drive — a backup on the same disk does not survive that disk failing.
            </p>
          </div>

          {files.length === 0 ? (
            <EmptyState title="No backup files yet" />
          ) : (
            <ul className="divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200">
              {files.map((file, index) => (
                <li key={file.name} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs font-semibold text-ink-800">
                      {file.name}
                    </span>
                    <span className="text-xs text-ink-500">{formatDateTime(file.createdAt)}</span>
                  </span>

                  {index === 0 && <Badge tone="success">latest</Badge>}

                  <span className="tabular shrink-0 text-xs text-ink-500">
                    {sizeLabel(file.sizeBytes)}
                  </span>

                  <button
                    type="button"
                    onClick={() => download(file.name)}
                    className="shrink-0 rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
                    title="Download this backup"
                  >
                    <FiDownload className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-ink-500">
            Restore one with{" "}
            <code className="font-mono">
              pg_restore --clean --dbname={status.directory ? "easy_restaurant" : "easy_restaurant"}{" "}
              &lt;file&gt;
            </code>
            .
          </p>
        </div>
      )}
    </Card>
  );
};

export default Backups;
