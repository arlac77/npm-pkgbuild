import { readFileSync } from "fs";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";

import executable from "rollup-plugin-executable";
import cleanup from "rollup-plugin-cleanup";
import builtins from "builtin-modules";

const external = [...builtins];
const extensions = ["js", "mjs", "jsx", "tag"];
const plugins = [
  commonjs(),
  resolve(),
  json({
    preferConst: true,
    compact: true
  }),
  cleanup({
    extensions
  })
];

const { bin, main, module } = JSON.parse(
  readFileSync("./package.json", { encoding: "utf8" })
);

const config = Object.keys(bin || {}).map(name => {
  return {
    input: `src/${name}-cli.mjs`,
    output: {
      plugins: [executable()],
      banner:
        '#!/bin/sh\n":" //# comment; exec /usr/bin/env node --experimental-modules --experimental-wasm-modules "$0" "$@"',
      file: bin[name]
    }
  };
});

if (module !== undefined && main !== undefined && module != main) {
  config.push({
    input: module,
    output: {
      file: main
    }
  });
}

export default config.map(c => {
  c.output = {
    interop: false,
    externalLiveBindings: false,
    format: "cjs",
    ...c.output
  };
  return { plugins, external, ...c };
});
