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

test(
  kvtt,
  ["Nam", "e: x\nVersion: 0.0.0"],
  (k, v) => [k, properties[k]],
  "Name: aName\nVersion: 1.2.3\n"
);

test(
  kvtt,
  ["Nam", "e:\nVersion: 0.0.0"],
  (k, v) => [k, properties[k]],
  "Name: aName\nVersion: 1.2.3\n"
);

test(
  kvtt,
  ["Nam", "e: x\nVersion: 1.0.0"],
  (k, v) => [k === "Version" ? k : undefined, "1.2.3"],
  "Version: 1.2.3\n"
);
