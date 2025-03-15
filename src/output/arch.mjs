import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import { ContentEntry, ReadableStreamContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import {
  keyValueTransformer,
  equalSeparatedKeyValuePairOptions
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
  quote,
  utf8StreamOptions,
  compileFields,
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
  const f = fields[key];
  return f?.prefix ? f.prefix + key : key;
}

const PKGBUILD = "PKGBUILD";

let _ext = ".pkg.tar.xz";
let _prepared;
let _architecture = "aarch64";

export class ARCH extends Packager {
  static get name() {
    return "arch";
  }

  static get description() {
    return "generate Arch-Linux package";
  }

  static get fileNameExtension() {
    return _ext;
  }

  static get fields() {
    return fields;
  }

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

    const self = this;
    async function* trailingLines() {
      yield `
package() {
  depends=(${self.makeDepends(properties.dependencies).join(" ")})

  if [ "$(ls -A $srcdir)" ]
  then
    cp -rp $srcdir/* "$pkgdir"
  fi
}
`;
    }

    if (properties.backup?.[0] === "/") {
      properties.backup = properties.backup.replace(/\//, "");
    }

    const fp = fieldProvider(properties, fields);

    transformer.push({
      name: PKGBUILD,
      match: entry => entry.name === PKGBUILD,
      transform: async entry =>
        new ReadableStreamContentEntry(
          "../" + entry.name,
          keyValueTransformer(await entry.readStream, fp, {
            ...pkgKeyValuePairOptions,
            trailingLines
          })
        ),
      createEntryWhenMissing: () => new ContentEntry(PKGBUILD)
    });

    for await (const file of copyEntries(
      transform(aggregateFifo(sources), transformer),
      join(staging, "src"),
      expander
    )) {
      if (options.verbose) {
        console.log(file.destination);
      }
    }

    if (options.verbose) {
      console.log(await readFile(join(staging, PKGBUILD), utf8StreamOptions));
      console.log("***", staging, "***");
      const ls = await execa("ls", ["-lR"], { cwd: staging });
      console.log(ls.stdout);
      console.log("*** end ***");
    }

    if (!options.dry) {
      let PACKAGER;

      if (properties.contributors?.length > 0) {
        PACKAGER = person(properties.contributors);
      }

      const makepkg = await execa("makepkg", ["-c", "-f", "-e"], {
        cwd: staging,
        env: { PKGDEST: destination, PACKAGER }
      });

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

const default_attribute = { type: "string" };
const default_array_attribute = { type: "string[]" };

/**
 * well known package properties
 * https://www.archlinux.org/pacman/PKGBUILD.5.html
 */
const fields = compileFields({
  Maintainer: { alias: "maintainer", type: "string[]", prefix: "# " },
  packager: { alias: "maintainer", type: "string[]" },
  pkgname: { ...NAME_FIELD, type: "string[]" },
  pkgver: { ...VERSION_FIELD },
  pkgrel: { alias: "release", type: "integer", default: 1, mandatory: true },
  epoch: { type: "integer", default: 0 },
  pkgdesc: { ...DESCRIPTION_FIELD },
  url: { alias: "homepage", type: "string" },
  license: { type: "string[]", mandatory: true },
  install: { type: "string" },
  changelog: { type: "string" },
  source: default_array_attribute,
  validpgpkeys: default_array_attribute,
  noextract: default_attribute,
  cksums: default_array_attribute,
  md5sums: default_array_attribute,
  sha1sums: default_array_attribute,
  sha256sums: default_array_attribute,
  sha384sums: default_array_attribute,
  sha512sums: default_array_attribute,
  groups: default_array_attribute,
  arch: { ...default_array_attribute, default: ["any"], mandatory: true },
  backup: default_array_attribute,
  depends: default_array_attribute,
  makedepends: default_attribute,
  checkdepends: default_attribute,
  optdepends: default_attribute,
  conflicts: default_attribute,
  provides: default_attribute,
  replaces: default_attribute,
  options: default_attribute
});
