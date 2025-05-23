import test from "ava";
import { FileContentProvider } from "npm-pkgbuild";

async function fcpt(t, definition, destination, list) {
  const content = new FileContentProvider(
    definition,
    typeof destination === "string" ? { destination } : destination
  );

  let entries = [];

  try {
    entries = await Array.fromAsync(content);
  } catch (e) {
    if (Array.isArray(list)) {
      throw e;
    }

    t.true(e.message.startsWith(list), list, "expected error");
    return;
  }

  t.deepEqual(
    await Promise.all(entries.map(async entry => {
      const r = { name: entry.name, destination: entry.destination };
      for (const a of ["user", "group", "mode"]) {
        const value = await entry[a];
        if (value) {
          r[a] = value;
        }
      }
      return r;
    })),
    list
  );

  const exists = await Promise.all(entries.map(e => e.isExistent));
  t.is(exists.filter(e => e).length, entries.length);
}

fcpt.title = (
  providedTitle = "FileContentProvider list",
  definition,
  destination,
  list
) =>
  ` ${providedTitle} ${JSON.stringify(definition)} -> ${JSON.stringify(
    list
  )}`.trim();

test(
  fcpt,
  new URL("fixtures/skeleton/package.json", import.meta.url).pathname,
  { destination: "dest/package.json", user: "root", group: "sys", mode: 0o100640 },
  [
    {
      name: "package.json",
      user: "root",
      group: "sys",
      mode: 0o100640,
      destination: "dest/package.json"
    }
  ]
);

test(
  fcpt,
  {
    base: new URL("fixtures/skeleton", import.meta.url).pathname
  },
  "dest",
  [{ name: "package.json", mode: 0o100644, destination: "dest" }]
);

test(
  fcpt,
  {
    base: new URL("fixtures/skeleton", import.meta.url).pathname,
    pattern: "**/*.json"
  },
  "dest",
  [{ name: "package.json", mode: 0o100644, destination: "dest" }]
);

test(
  fcpt,
  {
    base: new URL("fixtures/skeleton", import.meta.url).pathname,
    pattern: "**/*.txt"
  },
  "dest",
  []
);

test(
  fcpt,
  "pacman/tmpfiles.conf",
  "dest",
  "File not found " // pacman/tmpfiles.conf"
);
test(fcpt, new URL("fixtures/content/", import.meta.url).pathname, "dest", [
  { name: "file1.txt", mode: 0o100644, destination: "dest" },
  { name: "file2 with spaces.txt", mode: 0o100644, destination: "dest" },
  { name: "file2.json", mode: 0o100644, destination: "dest" }
]);
test(
  fcpt,
  new URL("fixtures/content/*.txt", import.meta.url).pathname,
  "dest",
  [
    { name: "file1.txt", mode: 0o100644, destination: "dest" },
    { name: "file2 with spaces.txt", mode: 0o100644, destination: "dest" }
  ]
);
