/**
 * Every key in English must exist in every other language, with the same
 * {{interpolation}} variables. CLAUDE.md requires a new key in all seven
 * folders; this is what enforces it.
 *
 * Plural forms differ by language (Arabic has zero/one/two/few/many/other,
 * English only one/other), so keys are compared with the plural suffix removed.
 */
import fs from "fs";
import path from "path";

const LOCALES = path.join(__dirname, "..", "locales");
const LANGS = ["en", "nl", "es", "de", "pt", "fr", "ar"];
const PLURAL = /_(zero|one|two|few|many|other)$/;

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = "", out = new Map<string, string>()) {
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(key, v);
    else flatten(v, key, out);
  }
  return out;
}

function load(lang: string, ns: string) {
  const file = path.join(LOCALES, lang, ns);
  return flatten(JSON.parse(fs.readFileSync(file, "utf8")) as Tree);
}

/** key (plural suffix stripped) → union of {{vars}} across its plural forms */
function shape(entries: Map<string, string>) {
  const out = new Map<string, Set<string>>();
  for (const [key, value] of entries) {
    const base = key.replace(PLURAL, "");
    const vars = out.get(base) ?? new Set<string>();
    for (const m of value.matchAll(/\{\{\s*(\w+)/g)) vars.add(m[1]);
    out.set(base, vars);
  }
  return out;
}

const namespaces = fs.readdirSync(path.join(LOCALES, "en")).filter((f) => f.endsWith(".json"));

it("every language has every namespace file", () => {
  for (const lang of LANGS) {
    const files = fs.readdirSync(path.join(LOCALES, lang)).filter((f) => f.endsWith(".json"));
    expect({ lang, files: files.sort() }).toEqual({ lang, files: [...namespaces].sort() });
  }
});

describe.each(namespaces)("%s", (ns) => {
  const en = shape(load("en", ns));

  it.each(LANGS.filter((l) => l !== "en"))("%s has every English key with the same variables", (lang) => {
    const other = shape(load(lang, ns));
    const missing = [...en.keys()].filter((k) => !other.has(k));
    const extra = [...other.keys()].filter((k) => !en.has(k));
    const varMismatch = [...en.keys()]
      .filter((k) => other.has(k))
      .filter((k) => [...en.get(k)!].sort().join() !== [...other.get(k)!].sort().join());
    expect({ missing, extra, varMismatch }).toEqual({ missing: [], extra: [], varMismatch: [] });
  });
});
