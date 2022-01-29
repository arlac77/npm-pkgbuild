import test from "ava";
import { FileContentProvider } from "npm-pkgbuild";

async function fcpt(t, definition, destination, list) {
  const content = new FileContentProvider(definition,{ destination });

  const entries = [];
  for await (const entry of content) {
    entries.push(entry);
  }

  t.deepEqual(entries.map(e => {return { name: e.name, destination: e.destination}; }),list);

  const exists = await Promise.all(entries.map(e => e.isExistent));
  t.is(exists.filter(e => e).length, entries.length);
}
fcpt.title = (providedTitle = "FileContentProvider list", definition, destination, list) =>
  ` ${providedTitle} ${JSON.stringify(
    definition
  )} -> ${JSON.stringify(list)}`.trim();


test(fcpt, new URL("fixtures/skeleton/package.json", import.meta.url).pathname, "dest/package.json",
  [{name: "package.json", destination: "dest/package.json"}]
);

test(
  fcpt,
  {
    base: new URL("fixtures/skeleton", import.meta.url).pathname
  },
  "dest",
  [{name:"package.json",destination:"dest/"}]
);

test(
  fcpt,
  {
    base: new URL("fixtures/skeleton", import.meta.url).pathname,
    pattern: "**/*.json"
  },
  "dest",
  [{name:"package.json", destination: "dest/"}]
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
  []
);
