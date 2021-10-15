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

test("kv", async t => {
  const properties = { Name: "aName", Version: "1.2.3" };

  t.is(
    await collect(
      keyValueTransformer(
        it(["Nam", "e: x\nVersion: 0.0.0"]),
        (k, v) => [k,properties[k]]
      )
    ),
    "Name: aName\nVersion: 1.2.3"
  );
});
