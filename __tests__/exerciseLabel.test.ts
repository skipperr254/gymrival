import { exerciseLabel } from "@/lib/i18n/exercises";

// A real i18next instance with the real Dutch file, so the test proves the key
// format matches how the locale files are structured (the app's own i18n entry
// point pulls in native Intl polyfills that don't load under Jest).
jest.mock("@/lib/i18n/index", () => {
  const i18next = jest.requireActual("i18next");
  const instance = i18next.createInstance();
  instance.init({
    lng: "nl",
    fallbackLng: "en",
    initImmediate: false,
    resources: {
      nl: { exercises: jest.requireActual("../locales/nl/exercises.json") },
      en: { exercises: jest.requireActual("../locales/en/exercises.json") },
    },
  });
  return { __esModule: true, default: instance };
});

describe("exerciseLabel", () => {
  it("translates by exercise key", () => {
    expect(exerciseLabel("bench", "Bench Press")).toBe("Bankdrukken");
    expect(exerciseLabel("pullups", "Pull-ups")).toBe("Optrekken");
  });

  it("falls back to the database label for a key with no translation", () => {
    expect(exerciseLabel("brand_new_lift", "Brand New Lift")).toBe("Brand New Lift");
  });
});
