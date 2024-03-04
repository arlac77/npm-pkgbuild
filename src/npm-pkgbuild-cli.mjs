#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { program, Option } from "commander";
import { createExpressionTransformer } from "content-entry-transform";
import { UTIController } from "uti";
import { utf8StreamOptions } from "./util.mjs";
import additionalUTIs from "./utis.mjs";
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
  .option("--dry", "do not execute, only print definitions", false)
  .option("-D --define <a=b>", "define property", (str, former = {}) =>
    Object.assign(former, Object.fromEntries([str.split(/=/)]))
  )
  .option("-p --dir <dir>", "which package to use", process.cwd())
  .option(
    "-a --available",
    "only execute availabe output/arch combintions",
    false
  )
  .option("--continue", "continue on error")
  .option(
    "-c --content <dir>",
    "content directory",
    (c, a) => a.concat([c]),
    []
  )
  .option("-m --meta <dir>", "meta directory", (c, a) => a.concat([c]), [])
  .addOption(
    new Option(
      "--publish <url...>",
      "publishing urls (or directories) of the package"
    )
  )
  .action(async options => {
    try {
      const uc = new UTIController();
      uc.register(additionalUTIs);

      options.publish = preparePublish(options.publish, process.env);

      for await (const {
        properties,
        sources,
        output,
        variant,
        dependencies,
        context
      } of extractFromPackage(options, process.env)) {
        for (const inputFactory of allInputs.filter(
          inputFactory => options[inputFactory.name] === true
        )) {
          sources.push(new inputFactory());
        }

        for (const outputFactory of allOutputs.filter(
          o => options[o.name] === true || output[o.name] !== undefined
        )) {
          if (
            options.available &&
            !(await outputFactory.prepare(options, variant))
          ) {
            continue;
          }

          try {
            Object.assign(
              properties,
              output[outputFactory.name].properties,
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

            const o = new outputFactory(properties);
            const transformer = [
              createExpressionTransformer(
                entry => uc.fileNameConformsTo(entry.name, "public.text"),
                properties
              )
            ];

            if (options.verbose) {
              console.log("variant:");
              console.log(kv(variant, "  "));
              console.log("sources:");
              console.log("  " + sources.join("\n  "));
              console.log("dependencies:");
              console.log(kv(dependencies, "  "));
              console.log(kv(output));
            }

            const fileName = await o.execute(
              sources.map(c => c[Symbol.asyncIterator]()),
              transformer,
              dependencies,
              options,
              context.expand
            );

            if (!options.dry) {
              for (const p of options.publish) {
                await publish(fileName, p, o.properties);
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

function kv(object, prefix = "") {
  return object
    ? Object.entries(object)
        .map(([k, v]) => `${prefix}${k}: ${v}`)
        .join("\n")
    : "";
}
