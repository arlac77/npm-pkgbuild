import { join } from "path";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import { finished } from "stream";
import { promisify } from "util";
import { mkdtemp, mkdir, chmod } from "fs/promises";
import { execa } from "execa";
import { Packager } from "./packager.mjs";
import { quote } from "../util.mjs";

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

  async execute(sources, options) {
    const properties = this.properties;
    const mandatoryFields = this.mandatoryFields;
    const staging = await this.tmpdir;

    const pkgbuildFileName = join(tmp, "PKGBUILD");

    this.writePkbuild(pkgbuildFileName);

    const transformers = [];

    await copyEntries(transform(sources, transformers), staging);

    await execa("makepkg", [], { cwd: staging });
  }

  writePkbuild(pkgbuildFileName) {
    const out = createWriteStream(pkgbuildFileName, { encoding: "utf8" });

    out.write(`
package() {
   cp -r $srcdir/* "$pkgdir"
}
`);

    out.end();
  }
}

/**
 * well known package properties
 * https://www.archlinux.org/pacman/PKGBUILD.5.html
 */
const fields = {
  pkgname: { alias: "name", type: "string[]" },
  license: { type: "string[]" },
  source: { type: "string[]" },
  validpgpkeys: { type: "string[]" },
  noextract: { type: "string[]" },
  md5sums: { type: "string[]" },
  sha1sums: { type: "string[]" },
  sha256sums: { type: "string[]" },
  sha384sums: { type: "string[]" },
  sha512sums: { type: "string[]" },
  groups: { type: "string[]" },
  arch: { type: "string[]" },
  backup: { type: "string[]" },
  depends: { type: "string[]" },
  makedepends: { type: "string[]" },
  checkdepends: { type: "string[]" },
  optdepends: { type: "string[]" },
  conflicts: { type: "string[]" },
  provides: { type: "string[]" },
  replaces: { type: "string[]" },
  options: { type: "string[]" },

  pkgver: {},
  pkgrel: {},
  epoch: {},
  pkgdesc: {},
  url: {},
  install: {},
  changelog: {}
};

/*
export async function pkgbuild(context, stagingDir, out, options = {}) {
  const pkg = { contributors: [], pacman: {}, ...context.pkg };

  let md5sums;
  let source;
  let directory = "";

  if (pkg.repository) {
    source = pkg.repository.url;
    if (!source.startsWith("git+")) {
      source = "git+" + source;
    }

    md5sums = "SKIP";

    directory = pkg.repository.directory ? "/" + pkg.repository.directory : "";
  }

  const properties = {
    url: pkg.homepage,
    pkgdesc: pkg.description,
    license: pkg.license,
    pkgrel: context.properties.pkgrel,
    pkgver: context.properties.pkgver.replace(/\-.*$/, ""),
    pkgname: pkg.name,
    arch: "any",
    makedepends: "git",
    source,
    md5sums
  };

  optionsPKGBUILD.forEach(k => {
    const v = pkg.pacman[k];
    if (v !== undefined) {
      properties[k] = v;
    }
  });

  properties.depends = makeDepends({ ...pkg.engines });

  if (properties.install !== undefined || properties.hooks !== undefined) {
    properties.install = `${pkg.name}.install`;
  }

  const installdir = context.properties.installdir;

  arrayOptionsPKGBUILD.forEach(k => {
    const v = properties[k];
    if (v !== undefined && !Array.isArray(v)) {
      properties[k] = [v];
    }
  });

  let pkgver = "";

  if (context.properties.pkgver === "0.0.0-semantic-release") {
    pkgver = `
pkgver() {
  cd "$pkgname"
  printf "r%s.%s" "$(git rev-list --count HEAD)" "$(git rev-parse --short HEAD)"
}
`;
  }

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

  await promisify(finished);
}

function makeDepends(d) {
  if (d === undefined) {
    return [];
  }

  return Object.keys(d).reduce((a, c) => {
    const mapping = {
      node: "nodejs"
    };

    a.push(`${mapping[c] ? mapping[c] : c}${d[c].replace(/\-([\w\d]+)$/, "")}`);
    return a;
  }, []);
}
*/
