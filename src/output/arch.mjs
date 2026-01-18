import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { execa } from "execa";
import { default_attribute, string_attribute, string_collection_attribute_writable, integer_attribute } from "pacc";
import { ContentEntry, IteratorContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import {
  keyValueTransformer,
  equalSeparatedKeyValuePairOptions,
  Uint8ArraysToLines
} from "key-value-transformer";
import { aggregateFifo } from "aggregate-async-iterator";
import {
  Packager,
  pkgbuild_version_attribute,
  pkgbuild_description_attribute,
  pkgbuild_name_attribute,
  dependency_attribute_collection_writable
} from "./packager.mjs";
import {
  copyEntries,
  fieldProvider,
  quote,
  utf8StreamOptions,
  normalizeExpression
} from "../util.mjs";

function* keyValueLines(key, value, options) {
  yield `${keyPrefix(key)}${options.keyValueSeparator}${
    Array.isArray(value)
      ? "(" + value.map(v => quote(v)).join(" ") + ")"
      : quote(value)
  }${options.lineEnding}`;
}

/**
 * @type {Object} KeyValueTransformOptions
 * Options to describe key value pair separated by an equal sign '='
 */
export const pkgKeyValuePairOptions = {
  ...equalSeparatedKeyValuePairOptions,

  extractKeyValue: line => {
    const m = line.match(/^(#\s*)?(\w+)=\s*\((.*)\)|(.*)/);
    if (m) {
      return [m[2], m[3] ? m[3].split(/\s*,\s*/) : m[4]];
    }
  },
  keyValueLines
};

function keyPrefix(key) {
  const f = ARCH.attributes[key];
  return f?.prefix ? f.prefix + key : key;
}

const PKGBUILD = "PKGBUILD";

let _ext = ".pkg.tar.xz";
let _prepared;
let _architecture = "aarch64";

export class ARCH extends Packager {

  static get alias() {
    return "alpm";
  }

  static get name() {
    return "arch";
  }

  static get description() {
    return "generate Arch-Linux package (ALPM)";
  }

  static get fileNameExtension() {
    return _ext;
  }

  /**
   * well known package properties
   * https://www.archlinux.org/pacman/PKGBUILD.5.html
   */
  static attributes = {
    Maintainer: { ...string_collection_attribute_writable, alias: "maintainer", prefix: "# " },
    packager: { ...string_collection_attribute_writable, alias: "maintainer" },
    pkgname: { ...pkgbuild_name_attribute, collection: true },
    pkgver: pkgbuild_version_attribute,
    pkgrel: {
      ...integer_attribute,
      alias: "release",
      default: 1,
      mandatory: true
    },
    epoch: { ...integer_attribute, default: 0 },
    pkgdesc: pkgbuild_description_attribute,
    url: { ...string_attribute, alias: "homepage" },
    license: { ...string_collection_attribute_writable, mandatory: true },
    install: string_attribute,
    changelog: string_attribute,
    source: string_collection_attribute_writable,
    validpgpkeys: string_collection_attribute_writable,
    noextract: default_attribute,
    cksums: string_collection_attribute_writable,
    md5sums: string_collection_attribute_writable,
    sha1sums: string_collection_attribute_writable,
    sha256sums: string_collection_attribute_writable,
    sha384sums: string_collection_attribute_writable,
    sha512sums: string_collection_attribute_writable,
    groups: string_collection_attribute_writable,
    arch: { ...string_collection_attribute_writable, default: ["any"], mandatory: true },
    backup: string_collection_attribute_writable,
    depends: { ...dependency_attribute_collection_writable /*, alias: "dependencies" */ },
    makedepends: dependency_attribute_collection_writable,
    checkdepends: dependency_attribute_collection_writable,
    optdepends: dependency_attribute_collection_writable,
    conflicts: dependency_attribute_collection_writable,
    provides: dependency_attribute_collection_writable,
    replaces: dependency_attribute_collection_writable,
    options: default_attribute
  };

  static async prepare(options = {}, variant = {}) {
    if (_prepared === undefined) {
      try {
        await execa("makepkg", ["-V"]);

        const cfg = await readFile("/etc/makepkg.conf", utf8StreamOptions);

        function getValue(key) {
          const v = process.env[key];
          if (v !== undefined) {
            return v;
          }

          const i = cfg.indexOf(`${key}=`);
          if (i > 0) {
            const m = cfg
              .substring(i)
              .split(/\n/)[0]
              .match(/=['"]([^'"]+)['"]/);
            return m?.[1];
          }
        }
        _ext = getValue("PKGEXT");
        _architecture = getValue("CARCH");
        _prepared = true;
      } catch (e) {
        _prepared = false;
      }
    }

    return (
      _prepared &&
      (variant.arch === undefined || variant.arch === _architecture)
    );
  }

  get packageFileName() {
    const p = this.properties;
    return `${p.name}-${p.version}-${p.release}-${p.arch}${this.fileNameExtension}`;
  }

  dependencyExpression(name, expression) {
    return quote(`${this.packageName(name)}${normalizeExpression(expression)}`);
  }

  async create(sources, transformer, publishingDetails, options, expander) {
    const { properties, staging, destination } = await this.prepare(options);

    if (properties.source) {
      properties.md5sums = ["SKIP"];
    }
    if (properties.hooks) {
      properties.install = `${properties.name}.install`;

      const out = createWriteStream(
        join(staging, properties.install),
        utf8StreamOptions
      );

      for await (const hook of this.hookContent()) {
        out.write(`${hook.name}() {\n`);
        out.write(hook.string);
        out.write(`\n}\n`);
      }
      out.end();
    }

    const verbose = options.verbose ? 'ls -laR "$pkgdir"' : "";

    const self = this;
    async function* trailingLines() {
      yield `
package() {
  depends=(${self.makeDepends(properties.dependencies).join(" ")})

  if [ "$(ls -A $srcdir)" ]
  then
    cp -rp $srcdir/* "$pkgdir"
### CHOWN ###

    ${verbose}
  fi
}
`;
    }

    if (properties.backup?.[0] === "/") {
      properties.backup = properties.backup.replace(/\//, "");
    }

    console.log(properties);
    const fp = fieldProvider(properties, this.attributes);

    transformer.push({
      name: PKGBUILD,
      match: entry => entry.name === PKGBUILD,
      transform: async entry =>
        new IteratorContentEntry(
          "../" + entry.name,
          undefined,
          keyValueTransformer(Uint8ArraysToLines(await entry.stream), fp, {
            ...pkgKeyValuePairOptions,
            trailingLines
          })
        ),
      createEntryWhenMissing: () => new ContentEntry(PKGBUILD)
    });

    const ownership = [];

    for await (const file of copyEntries(
      transform(aggregateFifo(sources), transformer),
      join(staging, "src"),
      expander
    )) {
      if (file.owner || file.group) {
        ownership.push(file);
      }

      if (options.verbose) {
        console.log(file.destination);
      }
    }

    if (ownership.length) {
      const pkgbuild = join(staging, PKGBUILD);
      let content = await readFile(pkgbuild, utf8StreamOptions);
      const markerPos = content.indexOf("### CHOWN ###");

      content =
        content.substring(0, markerPos) +
        ownership
          .map(
            f =>
              `    chown ${[f.owner || "", f.group || ""].join(
                ":"
              )} \"$pkgdir/${f.destination}\"`
          )
          .join("\n") +
        content.substring(markerPos + 14);

      await writeFile(pkgbuild, content, utf8StreamOptions);
    }

    if (options.verbose) {
      console.log(await readFile(join(staging, PKGBUILD), utf8StreamOptions));
    }

    if (!options.dry) {
      let PACKAGER;

      if (properties.contributors?.length > 0) {
        PACKAGER = person(properties.contributors);
      }

      const makePackageOptions = ["--noprogressbar", "-m", "-c", "-f", "-e"];
      if (options.verbose) {
        makePackageOptions.push("--log");
      }

      const makepkg = await execa(
        "makepkg",
        makePackageOptions,
        {
          cwd: staging,
          env: { PKGDEST: destination, PACKAGER }
        }
      );

      if (options.verbose) {
        console.log(makepkg.stdout);
      }
    }

    return join(destination, this.packageFileName);
  }
}

function person(contributors) {
  return contributors[0].name + " " + contributors[0].email;
}
