import config from "../../config/config.js";
import { asyncHandler } from "../../utils/helperFunctions.js";
import { getSettings, saveSettings } from "../../services/settingsService.js";

/**
 * Branding comes from the root .env and is read-only here on purpose: the name
 * has to be identical on the receipt, the browser tab and the login screen, and
 * one file is easier to trust than a database row somebody can edit at 2am.
 */
export const getBranding = asyncHandler(async (_req, res) => {
  res.status(200).json({
    appName: config.appName,
    tagline: config.appTagline,
    currency: config.currency,
    phone: config.appPhone,
    address: config.appAddress,
    footerNote: config.appFooterNote,
  });
});

export const getAllSettings = asyncHandler(async (_req, res) => {
  const settings = await getSettings();

  res.status(200).json({
    branding: {
      appName: config.appName,
      tagline: config.appTagline,
      currency: config.currency,
      phone: config.appPhone,
      address: config.appAddress,
      footerNote: config.appFooterNote,
    },
    settings,
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await saveSettings(req.body);
  res.status(200).json({ message: "Settings saved", data: settings });
});
