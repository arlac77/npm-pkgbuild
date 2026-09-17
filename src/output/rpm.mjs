import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { cp } from "node:fs/promises";
import { execa } from "execa";
import {
  integer_attribute_writable,
  url_attribute_writable,
  string_attribute_writable,
  string_collection_attribute_writable
} from "pacc";
import { ContentEntry, IteratorContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import {
  keyValueTransformer,
  colonSeparatedKeyValuePairOptionsDoublingKeys,
  Uint8ArraysToLines
} from "key-value-transformer";
import { Packager } from "./packager.mjs";
import {
  pkgbuild_version_attribute,
  pkgbuild_description_attribute,
  pkgbuild_name_attribute,
  arch_attribute_writable,
  dependency_attribute_collection_writable
} from "../types.mjs";
import {
  copyEntries,
  fieldProvider,
  utf8StreamOptions,
  aggregate
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

  /**
   * @see https://rpm-packaging-guide.github.io
   */
  static attributes = {
    name: { ...pkgbuild_name_attribute, externalName: "Name" },
    description: { ...pkgbuild_description_attribute, externalName: "Summary" },
    license: {
      ...string_attribute_writable,
      name: "license",
      externalName: "License",
      mandatory: true
    },
    version: { ...pkgbuild_version_attribute, externalName: "Version" },
    release: {
      ...integer_attribute_writable,
      externalName: "Release",
      name: "release",
      default: 1,
      mandatory: true
    },
    source: {
      ...string_attribute_writable,
      externalName: "Source0",
      name: "source"
    },
    groups: {
      ...string_attribute_writable,
      externalName: "Group",
      name: "groups",
      skipEmpty: true
    },
    maintainer: {
      ...string_attribute_writable,
      name: "maintainer",
      externalName: "Packager"
    },
    vendor: {
      ...string_attribute_writable,
      externalName: "Vendor",
      name: "vendor",
      skipEmpty: true
    },
    arch: {
      ...arch_attribute_writable,
      externalName: "BuildArch",
      default: "noarch",
      mapping: { any: "noarch" }
    },
    URL: {
      ...url_attribute_writable,
      name: "URL",
      alias: "homepage",
      skipEmpty: true
    },
    dependencies: {
      ...dependency_attribute_collection_writable,
      externalName: "Requires"
    },
    Obsoletes: { ...dependency_attribute_collection_writable, name: "Obsoletes" },
    Conflicts: { ...dependency_attribute_collection_writable, name: "Conflicts" }
  };

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

  dependencyExpression(name, expression) {
    return `${this.packageName(name)}${expression
      .replace(/^\s*(\w+)/, (match, p1) => ` = ${p1}`)
      .replace(/^\s*$/, "")
      .replace(
        /^\s*(<|<=|>|>=|=)\s*(\w+)/,
        (match, p1, p2) => ` ${p1} ${p2}`
      )}`;
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
    const { properties, tmpdir, staging, destination } =
      await this.prepare(options);

    properties.dependencies = this.makeDepends(properties.dependencies);

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
        yield* hook.string.split("\n").map(l => l + "\n");
      }

      yield `%files\n\n`;
      for (const file of files) {
        yield quoteFile("/" + file) + "\n";
      }

      for await (const file of copyEntries(
        transform(aggregate(sources), transformer),
        staging,
        expander
      )) {
        if (options.verbose) {
          console.log(file.destination);
        }
        yield file.destination + "\n";
      }
    }

    const fp = fieldProvider(properties, this.attributes);

    for await (const file of copyEntries(
      transform(aggregate(sources), [
        {
          match: entry => entry.name === specFileName,
          transform: async entry =>
            new IteratorContentEntry(
              entry.name,
              undefined,
              keyValueTransformer(Uint8ArraysToLines(await entry.stream), fp, {
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
