import test from "ava";
import { FileContentProvider } from "npm-pkgbuild";

async function fcpt(t, definition, list) {
  const content = new FileContentProvider(definition);

  const entries = [];
  for await (const entry of content) {
    entries.push(entry);
  }

  t.deepEqual(
    entries.map(e => e.name),
    list
  );

  const exists = await Promise.all(entries.map(e => e.isExistent));
  t.is(exists.filter(e => e).length, entries.length);

  //entry.getReadStream({ encoding: "utf-8" });
}
fcpt.title = (providedTitle = "FileContentProvider list", definition, list) =>
  ` ${providedTitle} ${JSON.stringify(
    definition
  )} -> ${JSON.stringify(list)}`.trim();


test(
  fcpt,
  {
    base: new URL("fixtures/skeleton", import.meta.url).pathname
  },
  ["package.json"]
);

test(
  fcpt,
  {
    base: new URL("fixtures/skeleton", import.meta.url).pathname,
    pattern: "**/*.json"
  },
  ["package.json"]
);

test(
  fcpt,
  {
    base: new URL("fixtures/skeleton", import.meta.url).pathname,
    pattern: "**/*.txt"
  },
  []
);

test(
  fcpt,
  "pacman/tmpfiles.conf",
  []
);
