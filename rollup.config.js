import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import executable from "rollup-plugin-executable";
import json from "rollup-plugin-json";
import cleanup from "rollup-plugin-cleanup";
import pkg from "./package.json";

const external = [
  "os",
  "url",
  "net",
  "tty",
  "assert",
  "events",
  "fs",
  "path",
  "stream",
  "util",
  "caporal",
  "execa"
];

export default [
  ...Object.keys(pkg.bin || {}).map(name => {
    return {
      input: `src/${name}-cli.mjs`,
      output: {
        file: pkg.bin[name],
        format: "cjs",
        banner:
          '#!/bin/sh\n":" //# comment; exec /usr/bin/env node --experimental-modules --experimental-worker "$0" "$@"',
        interop: false
      },
      external,
      plugins: [
        resolve(),
        commonjs(),
        json({
          include: "package.json",
          preferConst: true,
          compact: true
        }),
        cleanup(),
        executable()
      ]
    };
  }),
  {
    input: pkg.module,
    output: {
      file: pkg.main,
      format: "cjs",
      interop: false
    },
    external,
    plugins: [resolve(), commonjs(), json(), cleanup()]
  }
];
