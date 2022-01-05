import { join } from "path";
import { mkdir, cp } from "fs/promises";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import {
  keyValueTransformer,
  colonSeparatedKeyValuePairOptions
} from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { copyEntries, transform, fieldProvider } from "../util.mjs";

export class RPM extends Packager {
  static get name() {
    return "rpm";
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

  async execute(
    sources,
    transformer,
    dependencies,
    options,
    expander
  ) {
    const properties = this.properties;
    const tmp = await this.tmpdir;

    await Promise.all(
      ["BUILDROOT", "RPMS", "SRPMS", "SOURCES", "SPECS"].map(d =>
        mkdir(join(tmp, d))
      )
    );

    const staging = join(tmp, "BUILDROOT");
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
                console.log(file);
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
      `_topdir ${tmp}`,
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
      join(tmp, "RPMS", properties.arch, this.packageFileName),
      join(options.destination, this.packageFileName),
      { preserveTimestamps: true }
    );
    return join(options.destination, this.packageFileName);
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
