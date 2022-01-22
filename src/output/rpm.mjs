import { join } from "path";
import { cp } from "fs/promises";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import {
  keyValueTransformer,
  colonSeparatedKeyValuePairOptions
} from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { copyEntries, fieldProvider } from "../util.mjs";

export class RPM extends Packager {
  static get name() {
    return "rpm";
  }

  static get description() {
    return "generate RPM package";
  }

  static get fileNameExtension() {
    return ".rpm";
  }

  get packageFileName() {
    const p = this.properties;
    return `${p.name}-${p.version}-${p.release}.${p.arch}${this.constructor.fileNameExtension}`;
  }

  static get fields() {
    return fields;
  }

  static get workspaceLayout() {
    return {
      named: {
        staging: "BUILDROOT"
      },
      others: ["RPMS", "SRPMS", "SOURCES", "SPECS"],
    };
  }

  static async available() {
    try {
      await execa("rpmbuild", ["--version"]);
      return true;
    } catch {}

    return false;
  }

  async execute(sources, transformer, dependencies, options, expander) {
    const { properties, tmpdir, staging, destination } = await this.prepareExecute(options);

    properties.Requires = Object.entries(dependencies)
      .map(([n, e]) => `${n}${e}`)
      .join(" ");

    const specFileName = `${properties.name}.spec`;

    const files = [];

    async function* trailingLines() {
      yield "%define _unpackaged_files_terminate_build 0\n";

      for (const [name, options] of Object.entries(sections)) {
        if (options.mandatory) {
          yield `%${name}\n\n`;

          if (name === "files") {
            for (const file of files) {
              yield "/" + file + "\n";
            }

            for await (const file of copyEntries(
              transform(sources, transformer),
              staging,
              expander
            )) {
              if (options.verbose) {
                console.log(file.destination);
              }
              yield file.destination + "\n";
            }
          }
        }
      }
    }

    const fp = fieldProvider(properties, fields);

    for await (const file of copyEntries(
      transform(sources, [
        {
          match: entry => entry.name === specFileName,
          transform: async entry =>
            new ReadableStreamContentEntry(
              entry.name,
              keyValueTransformer(await entry.readStream, fp, {
                ...colonSeparatedKeyValuePairOptions,
                trailingLines
              })
            ),
          createEntryWhenMissing: () => new EmptyContentEntry(specFileName)
        }
      ]),
      staging,
      expander
    )) {
      files.push(file.destination);
    }

    const rpmbuild = await execa("rpmbuild", [
      "--define",
      `_topdir ${tmpdir}`,
      "--buildroot",
      staging,
      "-vv",
      "-bb",
      join(staging, specFileName)
    ]);

    if (options.verbose) {
      console.log(rpmbuild.stdout);
    }

    await cp(
      join(tmpdir, "RPMS", properties.arch, this.packageFileName),
      join(destination, this.packageFileName),
      { preserveTimestamps: true }
    );
    return join(destination, this.packageFileName);
  }
}

/**
 * @see https://rpm-packaging-guide.github.io
 */
const fields = {
  Name: { alias: "name", type: "string", mandatory: true },
  Summary: { alias: "description", type: "string", mandatory: true },
  License: { alias: "license", type: "string", mandatory: true },
  Version: { alias: "version", type: "string", mandatory: true },
  Release: { alias: "release", type: "integer", default: 1, mandatory: true },
  Source0: { alias: "source", type: "string" },
  Group: { alias: "group", type: "string" },
  Packager: { alias: "maintainer", type: "string" },
  Vendor: { alias: "vendor", type: "string" },
  BuildArch: {
    alias: "arch",
    default: "noarch",
    type: "string",
    mandatory: true
  },
  URL: { alias: "homepage", type: "string" },
  Requires: { type: "string[]" }
};

const sections = {
  description: { mandatory: true },
  prep: { mandatory: false },
  build: { mandatory: false },
  install: { mandatory: false },
  check: { mandatory: false },
  files: { mandatory: true },
  changelog: { mandatory: false }
};
