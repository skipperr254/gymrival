// Extends app.json with values that must not live in the public repo.
//
// google-services.json (Firebase, Android push) is gitignored. EAS builds get
// it from the GOOGLE_SERVICES_JSON file environment variable (`eas env`);
// local builds fall back to the copy in the project root.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
