import { join } from "path";
import { mkdir } from "fs/promises";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import {
  keyValueTransformer,
  colonSeparatedKeyValuePairOptions
} from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { copyEntries, transform } from "../util.mjs";

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

  async execute(sources, options) {
    const properties = this.properties;
    const mandatoryFields = this.mandatoryFields;
    const tmp = await this.tmpdir;

    await Promise.all(
      ["staging", "RPMS", "SRPMS", "SOURCES", "SPECS"].map(d =>
        mkdir(join(tmp, d))
      )
    );

    const staging = join(tmp, "staging");

    function* controlProperties(k, v, presentKeys) {
      if (k === undefined) {
        for (const p of mandatoryFields) {
          if (!presentKeys.has(p)) {
            const v = properties[p];
            yield [p, v === undefined ? fields[p].default : v];
          }
        }
      } else {
        yield [k, properties[k] || v];
      }
    }

    const specFileName = `${properties.name}.spec`;

    async function* trailingLines() {
      for (const [name, options] of Object.entries(sections)) {
        yield `%${name}\n\n`;
      }
    }

    const transformers = [
      {
        match: entry => entry.name === specFileName,
        transform: async entry =>
          new ReadableStreamContentEntry(
            entry.name,
            keyValueTransformer(await entry.readStream, controlProperties, {
              ...colonSeparatedKeyValuePairOptions,
              trailingLines
            })
          ),
        createEntryWhenMissing: () => new EmptyContentEntry(specFileName)
      }
    ];

    await copyEntries(transform(sources, transformers), staging);

    await execa("rpmbuild", [
      "--define",
      `_topdir ${tmp}`,
      "-vv",
      "-bb",
      //  `--target=${properties.arch}`,
      join(staging, specFileName)
    ]);

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
  Source0: { type: "string" },
  Group: { alias: "group", type: "string" },
  Packager: { type: "string" },
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
  description: {},
  prep: {},
  build: {},
  install: {},
  check: {},
  files: {},
  changelog: {}
};
