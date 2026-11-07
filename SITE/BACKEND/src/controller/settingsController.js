import _asyncHandler4338 from "../util/asyncHandler.js";
const { asyncHandler  } = _asyncHandler4338;
import Setting from "../models/Setting.js";
import _landingConfig4943 from "../util/landingConfig.js";
const { mergeLandingConfig  } = _landingConfig4943;

// ── GET /api/settings ─────────────────────────────────────────────────────────
const getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.find({}).lean();
  const settingsMap = {};

  // Blacklist sensitive keys from being exposed publicly
  const sensitiveRegex = /secret|password|private_key|auth_token|token_secret|^smtp_config$|^email_templates$/i;

  settings.forEach((s) => {
    if (s.key && !sensitiveRegex.test(s.key)) {
      settingsMap[s.key] = s.value;
    }
  });

  settingsMap.landing_config = mergeLandingConfig(settingsMap.landing_config || {});
  res.json(settingsMap);
});

export default { getSettings };
