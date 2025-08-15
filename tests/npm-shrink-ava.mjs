import test from "ava";
import { shrinkNPM } from "../src/npm-shrink.mjs";

test("shrinkNPM", t => {
  t.deepEqual(
    shrinkNPM({
      exports: {
        node: "node.js",
        sub: { node: "sub-node.js", types: "sub-type.d.js" }
      }
    }),
    {
      exports: {
        node: "node.js",
        sub: { node: "sub-node.js" }
      }
    }
  );
});
