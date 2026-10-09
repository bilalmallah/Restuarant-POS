import Setting, { SETTING_DEFAULTS } from "../features/settings/settingModel.js";

/**
 * Settings are read on nearly every order, so they are cached in memory rather
 * than fetched per request. The cache is invalidated by the one code path that
 * writes them, which keeps it honest without a TTL.
 */
let cache = null;

export const getSettings = async () => {
  if (cache) return cache;

  const rows = await Setting.findAll();
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  cache = { ...SETTING_DEFAULTS, ...stored };
  return cache;
};

export const saveSettings = async (values) => {
  const entries = Object.entries(values).filter(([key]) => key in SETTING_DEFAULTS);

  await Promise.all(
    entries.map(([key, value]) =>
      Setting.upsert({ key, value: value === null || value === undefined ? "" : String(value) })
    )
  );

  cache = null;
  return getSettings();
};

export const clearSettingsCache = () => {
  cache = null;
};
