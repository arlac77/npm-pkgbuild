import { join } from "node:path";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { cp } from "node:fs/promises";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import {
  keyValueTransformer,
  colonSeparatedKeyValuePairOptionsDoublingKeys
} from "key-value-transformer";
import { aggregateFifo } from "aggregate-async-iterator";
import { Packager } from "./packager.mjs";
import {
  copyEntries,
  fieldProvider,
  utf8StreamOptions,
  extractFunctions,
  packageNameMapping
} from "../util.mjs";

/**
 * map install hook named from arch to rpm
 */
const hookMapping = {
  pre_install: "pre",
  post_install: "post",
  pre_remove: "preun",
  post_remove: "postun"
  /* TODO with logic check $1
  pre_upgrade:
  post_upgrade:*/
};

export function requiresFromDependencies(dependencies) {
  return Object.entries(dependencies).map(
    ([name, e]) =>
      `${packageNameMapping[name] ? packageNameMapping[name] : name}${e
        .replace(/^\s*(\w+)/,  (match, p1) => ` = ${p1}`)
        .replace(/^\s*$/,  "")
        .replace(/^\s*(<|<=|>|>=|=)\s*(\w+)/, (match, p1, p2) => ` ${p1} ${p2}`)}`
  );
}

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
      others: ["RPMS", "SRPMS", "SOURCES", "SPECS"]
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
    const { properties, tmpdir, staging, destination } =
      await this.prepareExecute(options);

    properties.Requires = requiresFromDependencies(dependencies);

    const specFileName = `${properties.name}.spec`;

    const files = [];

    async function* trailingLines() {
      yield "%define _unpackaged_files_terminate_build 0\n";
      yield `%description\n\n`;

      if (properties.hooks) {
        for await (const f of extractFunctions(
          createReadStream(properties.hooks, utf8StreamOptions)
        )) {
          const name = hookMapping[f.name];
          if (name) {
            yield `%${name}\n`;

            yield f.body.replace(
              /\{\{(\w+)\}\}/m,
              (match, key, offset, string) =>
                properties[key] || "{{" + key + "}}"
            ) + "\n\n";
          }
        }
      }

      yield `%files\n\n`;
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

    const fp = fieldProvider(properties, fields);

    for await (const file of copyEntries(
      transform(aggregateFifo(sources), [
        {
          match: entry => entry.name === specFileName,
          transform: async entry =>
            new ReadableStreamContentEntry(
              entry.name,
              keyValueTransformer(await entry.readStream, fp, {
                ...colonSeparatedKeyValuePairOptionsDoublingKeys,
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

    if (options.verbose) {
      console.log(
        await readFile(join(staging, specFileName), { encoding: "utf8" })
      );
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

    const packageFile = join(destination, this.packageFileName);

    await cp(
      join(tmpdir, "RPMS", properties.arch, this.packageFileName),
      packageFile,
      { preserveTimestamps: true }
    );
    return packageFile;
  }
}

const pkglist = { type: "string[]" };
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
  Group: { alias: "groups", type: "string" },
  Packager: { alias: "maintainer", type: "string" },
  Vendor: { alias: "vendor", type: "string" },
  BuildArch: {
    alias: "arch",
    default: "noarch",
    type: "string",
    mandatory: true
  },
  URL: { alias: "homepage", type: "string" },
  Requires: pkglist,
  Obsoletes: pkglist,
  Conflicts: pkglist
};
