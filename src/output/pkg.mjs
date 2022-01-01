import { join } from "path";
import { cp } from "fs/promises";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import {
  keyValueTransformer,
  equalSeparatedKeyValuePairOptions
} from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { copyEntries, transform, fieldProvider } from "../util.mjs";
import { quote } from "../util.mjs";

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

  async execute(sources, transformer, options, expander) {
    const properties = this.properties;

    //properties.depends = makeDepends({ ...pkg.engines });

    const staging = await this.tmpdir;

    async function* trailingLines() {
      yield `
package() {
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
      await cp(
        join(options.pkgdir, properties.hooks),
        join(staging, properties.hooks),
        {
          preserveTimestamps: true
        }
      );
    }

    await copyEntries(transform(sources, transformer, true), staging, expander);

    if (options.verbose) {
      console.log(`stagingDir: ${staging}`);
    }

    const makepkg = await execa("makepkg", ["-f"], {
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
  pkgrel: { alias: "release", type: "integer", default: 0, mandatory: true },
  epoch: { type: "integer", default: 0 },
  pkgdesc: { alias: "description", type: "string", mandatory: true },
  url: { alias: "homepage", type: "string" },
  license: { type: "string[]", mandatory: true },
  install: { alias: "hooks", type: "string" },
  changelog: { type: "string" },
  source: { default: [], type: "string[]" },
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

/*
  out.write(
    `# ${pkg.contributors
      .map(
        (c, i) => `${i ? "Contributor" : "Maintainer"}: ${c.name} <${c.email}>`
      )
      .join("\n# ")}

      build() {
  cd \${pkgname}${directory}
  sed -i 's/"version": ".* /"version": "${
    context.properties.pkgver
  }",/' package.json
  npm install
  npm pack
  npm prune --production
}

package() {
  depends=(${makeDepends(pkg.pacman.depends)
    .map(a => `"${a}"`)
    .join(" ")})

  mkdir -p \${pkgdir}${installdir}
  npx npm-pkgbuild --package \${srcdir}/\${pkgname}${directory} --staging \${pkgdir} content
}
*/

const mapping = {
  node: "nodejs"
};
