#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { program } from "commander";
import {
  createExpressionTransformer,
  nameExtensionMatcher
} from "content-entry-transform";
import { utf8StreamOptions, decodePassword } from "./util.mjs";
import {
  FileContentProvider,
  allInputs,
  allOutputs,
  extractFromPackage,
  publish
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
      "--publish <url>",
      "publishing url (or directory) of the package"
    )
      .env("PKGBUILD_PUBLISH")
      .argParser(value => {
        let values = value.split(/,/);
        if (values.length > 1) {
          values = values.map(v => process.env[v] || v);
          return {
            url: values[0],
            user: values[1],
            password: decodePassword(values[2])
          };
        }

        return { url: value };
      })
  )
  .action(async options => {
    try {
      const publishOptions = options.publish;

      for await (const {
        properties,
        sources,
        output,
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

          // start with a fresh copy
          options.publish = Object.assign({}, publishOptions);

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
              .map(
                source =>
                  new FileContentProvider({
                    base: source
                  })
              )
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
            console.log(output.properties);
            console.log(`sources: ${sources.join("\n  ")}`);
            console.log(`dependencies: ${JSON.stringify(dependencies)}`);
          }

          const fileName = await output.execute(
            sources.map(c => c[Symbol.asyncIterator]()),
            transformer,
            dependencies,
            options,
            context.expand
          );

          await publish(fileName, options.publish, properties);
        }
      }
    } catch (e) {
      console.error(e);
      if (!options.continue) {
        process.exit(-1);
      }
    }
  })
  .parse(process.argv);
