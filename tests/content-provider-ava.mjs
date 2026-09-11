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
      "a/b/*": { owner: "u1" },
      "**/*": { owner: "u2" }
    }
  },
  {
    "a/b/c": { owner: "u1", destination: "dest" },
    "a/a": { owner: "u2", destination: "dest" },
    "a/x.key": { mode: 0o600, destination: "dest" }
  }
);

test("ContentProvider constructor", t => {
  const cp1 = new ContentProvider({ dir: "dir", destination: "dest" });

  t.is(cp1.dir, "dir");
  t.is(cp1.destination, "dest");
  t.deepEqual(cp1.defaultProperties, { destination: "dest" });

  t.is(cp1.toString(), "ContentProvider: dir -> dest");

  const cp2 = new ContentProvider({ dir: "dir" });

  t.is(cp2.dir, "dir");
  t.is(cp2.destination, undefined);
  t.deepEqual(cp2.defaultProperties, {});

  t.is(cp2.toString(), "ContentProvider: dir");
});

test("ContentProvider constructor with permissions", t => {
  const cp = new ContentProvider({
    dir: "dir",
    destination: "dest",
    permissions: { owner: "u", group: "g" }
  });

  t.is(cp.dir, "dir");
  t.is(cp.destination, "dest");
  t.deepEqual(cp.defaultProperties, {
    owner: "u",
    group: "g",
    destination: "dest"
  });
});
