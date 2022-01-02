import { join, dirname } from "path";
import { createReadStream, createWriteStream } from "fs";
import { mkdir } from "fs/promises";
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
    const m = line.match(/^(\w+)=\s*\((.*)\)|(.*)/);
    if (m) {
      return [m[1], m[2] ? [m[2].split(/\s*,\s*/)] : m[3]];
    }
  },
  keyValueLine: (key, value, lineEnding) =>
    `${key}=${
      Array.isArray(value)
        ? "(" + value.map(v => quote(v)).join(",") + ")"
        : quote(value)
    }${lineEnding}`
};

export class PKG extends Packager {
  static get name() {
    return "pkg";
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

    //properties.depends = makeDepends(dependencies);

    const staging = await this.tmpdir;

    async function* trailingLines() {
      yield `
package() {
  depends=(${makeDepends(dependencies).map(v=>quote(v)).join(',')})
  cp -r $srcdir/* "$pkgdir"
}
`;
    }

    await copyEntries(
      transform(sources, transformer),
      join(staging, "src"),
      expander
    );

    const fp = fieldProvider(properties, fields);

    transformer.push({
      match: entry => entry.name === "PKGBUILD",
      transform: async entry =>
        new ReadableStreamContentEntry(
          entry.name,
          keyValueTransformer(await entry.readStream, fp, {
            ...pkgKeyValuePairOptions,
            trailingLines
          })
        ),
      createEntryWhenMissing: () => new EmptyContentEntry("PKGBUILD")
    });

    if (properties.hooks) {
      async function* transformer(expression, remainder, source, cb) {
        const value = properties[expression];
        yield value === undefined ? "" : value;
      }

      const destination = join(staging, properties.hooks);

      await mkdir(dirname(destination), { recursive: true });

      await pipeline(
        iterableStringInterceptor(
          createReadStream(
            join(options.pkgdir, properties.hooks),
            utf8StreamOptions
          ),
          transformer
        ),
        createWriteStream(destination, utf8StreamOptions)
      );
    }

    await copyEntries(transform(sources, transformer, true), staging, expander);

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
  pkgname: { alias: "name", type: "string[]", mandatory: true },
  pkgver: { alias: "version", type: "string", mandatory: true },
  pkgrel: { alias: "release", type: "integer", default: 1, mandatory: true },
  epoch: { type: "integer", default: 0 },
  pkgdesc: { alias: "description", type: "string", mandatory: true },
  url: { alias: "homepage", type: "string" },
  license: { type: "string[]", mandatory: true },
  install: { alias: "hooks", type: "string" },
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
  makedepends: { type: "string[]" },
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
