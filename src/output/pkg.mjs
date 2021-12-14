import { join } from "path";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import {
  keyValueTransformer,
  equalSeparatedKeyValuePairOptions
} from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { copyEntries, transform } from "../util.mjs";
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
    return `${p.name}-${p.version}-${p.release}.${p.arch}${this.constructor.fileNameExtension}`;
  }

  async execute(sources, options) {
    const properties = this.properties;

    //properties.depends = makeDepends({ ...pkg.engines });

    const mandatoryFields = this.mandatoryFields;
    const staging = await this.tmpdir;

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

    async function* trailingLines() {
      yield `
package() {
  cp -r $srcdir/* "$pkgdir"
}
`;
    }

    await copyEntries(transform(sources, []), join(staging, "src"));

    const metaTransformers = [
      {
        match: entry => entry.name === "PKGBUILD",
        transform: async entry =>
          new ReadableStreamContentEntry(
            entry.name,
            keyValueTransformer(await entry.readStream, controlProperties, {
              ...pkgKeyValuePairOptions,
              trailingLines
            })
          ),
        createEntryWhenMissing: () => new EmptyContentEntry("PKGBUILD")
      }
    ];

    await copyEntries(transform(sources, metaTransformers, true), staging);

    await execa("makepkg", ["-f"], { cwd: staging });

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
  pkgdesc: { alias: "description", type: "string", mandatory: true },
  arch: { default: ["any"], type: "string[]", mandatory: true },

  license: { default: [], type: "string[]", mandatory: true },
  source: { default: [], type: "string[]" },
  validpgpkeys: { type: "string[]" },
  noextract: { type: "string[]" },
  md5sums: { /*default: ["SKIP"],*/ type: "string[]" },
  sha1sums: { type: "string[]" },
  sha256sums: { type: "string[]" },
  sha384sums: { type: "string[]" },
  sha512sums: { type: "string[]" },
  groups: { type: "string[]" },
  backup: { type: "string[]" },
  depends: { type: "string[]" },
  makedepends: { type: "string[]" },
  checkdepends: { type: "string[]" },
  optdepends: { type: "string[]" },
  conflicts: { type: "string[]" },
  provides: { type: "string[]" },
  replaces: { type: "string[]" },
  options: { type: "string[]" },

  epoch: {},
  url: { alias: "homepage", type: "string" },
  install: {},
  changelog: {}
};

/*
  out.write(
    `# ${pkg.contributors
      .map(
        (c, i) => `${i ? "Contributor" : "Maintainer"}: ${c.name} <${c.email}>`
      )
      .join("\n# ")}
${Object.keys(properties)
  .filter(k => properties[k] !== undefined)
  .map(k => `${k}=${quote(properties[k])}`)
  .join("\n")}
${pkgver}
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
`
  );
*/

const mapping = {
  node: "nodejs"
};
