import test from "ava";
import { extractFunctions } from "npm-pkgbuild";

async function* source(text) {
  yield text;
}

test("extractFunctions", async t => {
  const functions = [];

  for await (const f of extractFunctions(
    source(`
post_install() {
    systemctl start {{name}}
}
pre_remove() {
    systemctl stop {{name}}
}
`)
  )) {
    functions.push(f);
  }

  t.deepEqual(functions[0], {
    name: "post_install",
    body: `    systemctl start {{name}}`
  });

  t.deepEqual(functions[1], {
    name: "pre_remove",
    body: `    systemctl stop {{name}}`
  });
});
