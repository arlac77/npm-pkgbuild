import test from "ava";
import { ContentProvider } from "npm-pkgbuild";

async function cpt(t, definition, matches) {
  const content = new ContentProvider(definition);

  for (const [name, properties] of Object.entries(matches)) {
    t.deepEqual(
      content.propertiesFor(name, false),
      properties,
      `matchin ${name}`
    );
  }
}

cpt.title = (
  providedTitle = "ContentProvider properties for pattern",
  definition,
  matches
) =>
  ` ${providedTitle} ${JSON.stringify(definition)} -> ${JSON.stringify(
    matches
  )}`.trim();

test(
  cpt,
  {
    dir: "somewhere",
    properties: {
      "a/*.key": { mode: 0o600 },
      "a/b/*": { user: "u1" },
      "**/*": { user: "u2" }
    }
  },
  {
    "a/b/c": { user: "u1" },
    "a/a": { user: "u2" },
    "a/x.key": { mode: 0o600 }
  }
);
