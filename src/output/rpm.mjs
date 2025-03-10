import { join } from "node:path";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { cp } from "node:fs/promises";
import { execa } from "execa";
import { ContentEntry, ReadableStreamContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import {
  keyValueTransformer,
  colonSeparatedKeyValuePairOptionsDoublingKeys
} from "key-value-transformer";
import { aggregateFifo } from "aggregate-async-iterator";
import {
  Packager,
  VERSION_FIELD,
  DESCRIPTION_FIELD,
  NAME_FIELD
} from "./packager.mjs";
import {
  copyEntries,
  fieldProvider,
  utf8StreamOptions,
  extractFunctions,
  compileFields
} from "../util.mjs";

/**
 * @typedef {import('../publish.mjs').PublishingDetail} PublishingDetail
 */

function quoteFile(name) {
  return name.match(/\s/) ? '"' + name + '"' : name;
}

/**
 * Produce rpm packages.
 */
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
    return `${p.name}-${p.version}-${p.release}.${p.arch}${this.fileNameExtension}`;
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

  /**
   * Check for rpmbuild presence.
   * @param {Object} options
   * @param {Object} variant
   * @param {string} variant.arch
   * @returns {Promise<boolean>} true when rpmbuild executable is present
   */
  static async prepare(options, variant) {
    try {
      await execa("rpmbuild", ["--version"]);
      if (variant?.arch) {
        const uname = await execa("uname", ["-m"]);
        return uname.stdout.match(variant.arch) ? true : false;
      }
      return true;
    } catch {}

    return false;
  }

  makeDepends(deps) {
    return super.makeDepends(
      deps,
      (name, expression) =>
        `${this.packageName(name)}${expression
          .replace(/^\s*(\w+)/, (match, p1) => ` = ${p1}`)
          .replace(/^\s*$/, "")
          .replace(
            /^\s*(<|<=|>|>=|=)\s*(\w+)/,
            (match, p1, p2) => ` ${p1} ${p2}`
          )}`
    );
  }

  /**
   * Map install hook named from default (arch) to rpm.
   */
  get hookMapping() {
    return {
      pre_install: "pre",
      post_install: "post",
      pre_remove: "preun",
      post_remove: "postun"
      /* TODO with logic check $1
  pre_upgrade:
  post_upgrade:*/
    };
  }

  async create(sources, transformer, publishingDetails, options, expander) {
    const { properties, tmpdir, staging, destination } = await this.prepare(
      options
    );

    properties.Requires = this.makeDepends(properties.dependencies);

    if (properties.Packager?.length > 1) {
      // TODO how to write several Packages ?
      properties.Packager.length = 1;
    }

    const specFileName = `${properties.name}.spec`;

    const files = [];

    const self = this;
    async function* trailingLines() {
      yield "%define _unpackaged_files_terminate_build 0\n";
      yield `%description\n\n`;

      for await (const hook of self.hookContent()) {
        yield `%${hook.name}\n`;
        yield * hook.string.split("\n").map(l=>l+"\n");
      }

      yield `%files\n\n`;
      for (const file of files) {
        yield quoteFile("/" + file) + "\n";
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
          createEntryWhenMissing: () => new ContentEntry(specFileName)
        }
      ]),
      staging,
      expander
    )) {
      files.push(file.destination);
    }

    if (options.verbose) {
      console.log(
        await readFile(join(staging, specFileName), utf8StreamOptions)
      );
    }

    const packageFile = join(destination, this.packageFileName);

    if (!options.dry) {
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
        join(
          tmpdir,
          "RPMS",
          // TODO handle arrays ?
          Array.isArray(properties.arch) ? properties.arch[0] : properties.arch,
          this.packageFileName
        ),
        packageFile,
        { preserveTimestamps: true }
      );
    }
    return packageFile;
  }
}

const pkglist = { type: "string[]" };
/**
 * @see https://rpm-packaging-guide.github.io
 */
const fields = compileFields({
  Name: { ...NAME_FIELD },
  Summary: { ...DESCRIPTION_FIELD },
  License: { alias: "license", type: "string", mandatory: true },
  Version: { ...VERSION_FIELD },
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
});
