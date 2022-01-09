import { join } from "path";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import { iterableStringInterceptor } from "iterable-string-interceptor";
import {
  keyValueTransformer,
  equalSeparatedKeyValuePairOptions
} from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { copyEntries, transform, fieldProvider } from "../util.mjs";
import { quote, utf8StreamOptions } from "../util.mjs";

/**
 * @type KeyValueTransformOptions
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
  keyValueLine: (key, value, lineEnding) =>
    `${keyPrefix(key)}=${
      Array.isArray(value)
        ? "(" + value.map(v => quote(v)).join(" ") + ")"
        : quote(value)
    }${lineEnding}`
};

function keyPrefix(key) {
  const f = fields[key];
  return f && f.prefix ? f.prefix + key : key;
}

export class ARCH extends Packager {
  static get name() {
    return "arch";
  }

  static get description()
  {
    return "generate Arch-Linux package";
  }

  static get fileNameExtension() {
    return ".pkg.tar.zst";
  }

  static get fields() {
    return fields;
  }

  get packageFileName() {
    const p = this.properties;
    return `${p.name}-${p.version}-${p.release}-${p.arch}${this.constructor.fileNameExtension}`;
  }

  async execute(sources, transformer, dependencies, options, expander) {
    const properties = this.properties;

    if (properties.source) {
      properties.md5sums = ["SKIP"];
    }
    if (properties.hooks) {
      properties.install = `${properties.name}.install`;
    }

    const staging = await this.tmpdir;

    async function* trailingLines() {
      yield `
package() {
  depends=(${makeDepends(dependencies)
    .map(v => quote(v))
    .join(" ")})

  if [ "$(ls -A $srcdir)" ]
  then
    cp -rp $srcdir/* "$pkgdir"
  fi
}
`;
    }

    if (properties.hooks) {
      async function* transformer(expression, remainder, source, cb) {
        const value = properties[expression];
        yield value === undefined ? "" : value;
      }

      await pipeline(
        iterableStringInterceptor(
          createReadStream(
            join(options.pkgdir, properties.hooks),
            utf8StreamOptions
          ),
          transformer
        ),
        createWriteStream(join(staging, properties.install), utf8StreamOptions)
      );
    }

    const fp = fieldProvider(properties, fields);

    transformer.push({
      name: "PKGBUILD",
      match: entry => entry.name === "PKGBUILD",
      transform: async entry =>
        new ReadableStreamContentEntry(
          "../" + entry.name,
          keyValueTransformer(await entry.readStream, fp, {
            ...pkgKeyValuePairOptions,
            trailingLines
          })
        ),
      createEntryWhenMissing: () => new EmptyContentEntry("PKGBUILD")
    });

    for await (const file of copyEntries(
      transform(sources, transformer),
      join(staging, "src"),
      expander
    )) {
      if (options.verbose) {
        console.log(file.destination);
      }
    }

    if (options.verbose) {
      console.log(`stagingDir: ${staging}`);
    }

    const makepkg = await execa("makepkg", ["-f", "-e"], {
      cwd: staging,
      env: { PKGDEST: options.destination }
    });

    if (options.verbose) {
      console.log(makepkg.stdout);
    }

    return join(options.destination, this.packageFileName);
  }
}

/**
 * well known package properties
 * https://www.archlinux.org/pacman/PKGBUILD.5.html
 */
const fields = {
  Maintainer: { alias: "maintainer", type: "string", prefix: "# " },

  pkgname: { alias: "name", type: "string[]", mandatory: true },
  pkgver: { alias: "version", type: "string", mandatory: true },
  pkgrel: { alias: "release", type: "integer", default: 1, mandatory: true },
  epoch: { type: "integer", default: 0 },
  pkgdesc: { alias: "description", type: "string", mandatory: true },
  url: { alias: "homepage", type: "string" },
  license: { type: "string[]", mandatory: true },
  install: { type: "string" },
  changelog: { type: "string" },
  source: { type: "string[]" },
  validpgpkeys: { type: "string[]" },
  noextract: { type: "string[]" },
  cksums: { type: "string[]" },
  md5sums: { type: "string[]" },
  sha1sums: { type: "string[]" },
  sha256sums: { type: "string[]" },
  sha384sums: { type: "string[]" },
  sha512sums: { type: "string[]" },
  groups: { type: "string[]" },
  arch: { default: ["any"], type: "string[]", mandatory: true },
  backup: { type: "string[]" },
  depends: { type: "string[]" },
  makedepends: { /*default: ["nodejs>=16.13.1"],*/ type: "string[]" },
  checkdepends: { type: "string[]" },
  optdepends: { type: "string[]" },
  conflicts: { type: "string[]" },
  provides: { type: "string[]" },
  replaces: { type: "string[]" },
  options: { type: "string[]" }
};

const mapping = {
  node: "nodejs"
};

function normalizeExpression(e) {
  e = e.replace(/\-([\w\d]+)$/, "");
  if (e.match(/^\d+/)) {
    return `>=${e}`;
  }

  return e;
}

function makeDepends(dependencies) {
  return Object.entries(dependencies).map(
    ([name, version]) => `${name}${normalizeExpression(version)}`
  );
}
