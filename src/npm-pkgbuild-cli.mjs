#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { program } from "commander";
import {
  createExpressionTransformer,
  nameExtensionMatcher
} from "content-entry-transform";
import { utf8StreamOptions } from "./util.mjs";
import {
  FileContentProvider,
  allInputs,
  allOutputs,
  extractFromPackage,
  publish,
  preparePublish
} from "npm-pkgbuild";

const { version, description } = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../package.json", import.meta.url)),
    utf8StreamOptions
  )
);

program.description(description).version(version);

allOutputs.forEach(o => program.option(`--${o.name}`, o.description));
allInputs.forEach(i => program.option(`--${i.name}`, i.description));

program
  .option("--verbose", "be more verbose", false)
  .option("--dry", "do not execut only print definitions", false)
  .option("-D --define <a=b>", "define property", (str, former = {}) =>
    Object.assign(former, Object.fromEntries([str.split(/=/)]))
  )
  .option("-p --dir <dir>", "which package to use", process.cwd())
  .option("-a --available", "only execute availabe output methods", false)
  .option("--continue", "continue on error")
  .option(
    "-c --content <dir>",
    "content directory",
    (c, a) => a.concat([c]),
    []
  )
  .option("-m --meta <dir>", "meta directory", (c, a) => a.concat([c]), [])
  .addOption(
    new program.Option(
      "--publish <url...>",
      "publishing urls (or directories) of the package"
    )
  )
  .action(async options => {
    try {
      options.publish = preparePublish(options.publish, process.env);

      for await (const {
        properties,
        sources,
        output,
        variant,
        dependencies,
        context
      } of extractFromPackage(options)) {
        for (const inputFactory of allInputs.filter(
          inputFactory => options[inputFactory.name] === true
        )) {
          sources.push(new inputFactory());
        }

        for (const outputFactory of allOutputs.filter(
          o => options[o.name] === true || output[o.name] !== undefined
        )) {
          if (options.available && !(await outputFactory.available)) {
            continute;
          }

          try {
            Object.assign(
              properties,
              {
                type: outputFactory.name,
                "user-agent": `npm-pkgbuild-${version}`
              },
              options.define
            );

            sources.push(
              ...[...options.content, ...options.meta]
                .filter(x => x)
                .map(source => {
                  let [destination, base] = source.split(/:/);
                  if (!base) {
                    destination = "/";
                    base = source;
                  }

                  return new FileContentProvider(
                    {
                      base
                    },
                    { destination }
                  );
                })
            );

            const output = new outputFactory(properties);
            const transformer = [
              createExpressionTransformer(
                nameExtensionMatcher([
                  ".conf",
                  ".json",
                  ".html",
                  ".css",
                  ".txt",
                  ".webmanifest",
                  ".service",
                  ".socket",
                  ".path",
                  ".timer",
                  ".rules"
                ]),
                properties
              )
            ];

            if (options.verbose) {
              console.log("variant:");
              console.log(kv(variant,"  "));
              console.log("sources:");
              console.log("  " + sources.join("\n  "));
              console.log("dependencies:");
              console.log(kv(dependencies,"  "));
              console.log(kv(output.properties));
            }

            const fileName = await output.execute(
              sources.map(c => c[Symbol.asyncIterator]()),
              transformer,
              dependencies,
              options,
              context.expand
            );

            if (!options.dry) {
              for (const p of options.publish) {
                await publish(fileName, p, output.properties);
              }
            }
          } catch (e) {
            handleError(e, options);
          }
        }
      }
    } catch (e) {
      handleError(e, options);
    }
  })
  .parse(process.argv);

function handleError(e, options) {
  console.error(e);
  if (!options.continue) {
    process.exit(-1);
  }
}

function kv(object, prefix="") {
  return object ? Object.entries(object)
    .map(([k, v]) => `${prefix}${k}: ${v}`)
    .join("\n"): "";
}
