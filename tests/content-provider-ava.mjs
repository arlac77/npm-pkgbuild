import test from "ava";
import { ContentProvider } from "npm-pkgbuild";

async function cpt(t, definition, matches) {
  const content = new ContentProvider(definition);

  for (const [name, properties] of Object.entries(matches)) {
    t.deepEqual(
      content.propertiesFor(name, false),
      properties,
      `matching ${name}`
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
    destination: "dest",
    permissions: {
      "a/*.key": { mode: 0o600 },
      "a/b/*": { user: "u1" },
      "**/*": { user: "u2" }
    }
  },
  {
    "a/b/c": { user: "u1", destination: "dest" },
    "a/a": { user: "u2", destination: "dest" },
    "a/x.key": { mode: 0o600, destination: "dest" }
  }
);

test("ContentProvider constructor", t => {
  const cp = new ContentProvider({ dir: "dir", destination: "dest" });

  t.is(cp.dir, "dir");
  t.is(cp.destination, "dest");
  t.deepEqual(cp.defaultProperties, { destination: "dest" });
});

test("ContentProvider constructor with permissions", t => {
  const cp = new ContentProvider({
    dir: "dir",
    destination: "dest",
    permissions: { user: "u", group: "g" }
  });

  t.is(cp.dir, "dir");
  t.is(cp.destination, "dest");
  t.deepEqual(cp.defaultProperties, {
    user: "u",
    group: "g",
    destination: "dest"
  });
});
