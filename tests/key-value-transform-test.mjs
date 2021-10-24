import test from "ava";
import { keyValueTransformer } from "../src/key-value-transformer.mjs";

export async function* it(a) {
  for (const c of a) {
    yield c;
  }
}

export async function collect(a) {
  const parts = [];
  for await (const c of a) {
    parts.push(c);
  }

  return parts.join("");
}

async function kvtt(t, input, updates, result) {
  t.is(await collect(keyValueTransformer(it(input), updates)), result);
}

kvtt.title = (providedTitle = "keyValueTransformer", input, updates, result) =>
  ` ${providedTitle} ${JSON.stringify(input)} -> ${JSON.stringify(
    result
  )}`.trim();

const properties = { Name: "aName", Version: "1.2.3" };

function* identity(k, v) {
  if (k !== undefined) {
    yield [k, v];
  }
}

function* props(k, v) {
  if (k !== undefined) {
    yield [k, properties[k]];
  }
}

function* versionOnly(k, v) {
  if (k === "Version") {
    yield [k, "1.2.3"];
  }
}

function* descriptionOnly(k, v) {
  if (k !== undefined) {
    if (k === "Description") {
      yield [k, "replaced"];
    } else {
      yield [k, "a name"];
    }
  }
}

test(kvtt, ["# some content"], identity, "# some content\n");

test(kvtt, ["p", "1: v1\np2:  v2"], identity, "p1: v1\np2: v2\n");

test(
  kvtt,
  ["Nam", "e:\nVersion: 0.0.0"],
  props,
  "Name: aName\nVersion: 1.2.3\n"
);

test(kvtt, ["Nam", "e: x\nVersion: 1.0.0"], versionOnly, "Version: 1.2.3\n");

test(
  kvtt,
  ["Nam", "e: x\nDescription: line1\n line2"],
  descriptionOnly,
  "Name: a name\nDescription: replaced\n"
);
