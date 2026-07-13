const { withEntitlementsPlist } = require("@expo/config-plugins");

// expo-notifications' iOS config plugin is auto-applied by Expo's prebuild
// step (it's in @expo/prebuild-config's hardcoded "versioned SDK plugins"
// list) regardless of whether it's listed in app.json's own `plugins`
// array. It always adds the `aps-environment` entitlement for remote push,
// which free/personal Apple developer teams can't sign. We only use local
// notifications, so strip it back out.
module.exports = function withNoPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    return config;
  });
};
