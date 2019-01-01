import { join } from "path";
import { promisify } from "util";
import { finished } from "stream";
import { quote } from "./util";
import fs from "fs";

export async function pkgbuild(context, stagingDir, out) {
  const pkg = context.pkg;

  let repo = pkg.repository.url;
  if (!repo.startsWith("git+")) {
    repo = "git+" + repo;
  }

  const properties = Object.assign(
    {
      url: pkg.homepage,
      pkgdesc: pkg.description,
      license: pkg.license,
      pkgrel: 1,
      pkgver: pkg.version.replace(/[\w\-]+$/, ""),
      pkgname: pkg.name,
      arch: "any",
      makedepends: "git",
      depends: `nodejs${
        pkg.engines && pkg.engines.node ? pkg.engines.node : ""
      }`,
      source: repo,
      md5sums: "SKIP"
    },
    pkg.pacman
  );

  const installdir = context.properties.installdir;

  console.log(`installdir: ${installdir}`);

  if (properties.install !== undefined) {
    properties.install = join("..", properties.install);
  }

  [
    "pkgname",
    "license",
    "source",
    "validpgpkeys",
    "noextract",
    "md5sums",
    "sha1sums",
    "sha256sums",
    "sha384sums",
    "sha512sums",
    "groups",
    "arch",
    "backup",
    "depends",
    "makedepends",
    "checkdepends",
    "optdepends",
    "conflicts",
    "provides",
    "replaces",
    "options"
  ].forEach(k => {
    const v = properties[k];
    if (v !== undefined && !Array.isArray(v)) {
      properties[k] = [v];
    }
  });

  if (properties.backup !== undefined) {
    properties.backup = properties.backup.map(name =>
      join(installdir, name).substring(1)
    );
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

#pkgver() {
#  cd "$pkgname"
#  printf "r%s.%s" "$(git rev-list --count HEAD)" "$(git rev-parse --short HEAD)"
#}

build() {
  #cd "$pkgname"
  npm install
  npm pack
  npm prune --production
  rm -rf node_modules/.bin
  find . \\( -name "*~" -o -name "*.mk" -o -name "*.bat" -o -name "*.tmp" -o -name "*.orig" \\) -print0 \\
  | xargs -r -0 rm
  find node_modules -name "*.1" -print0|xargs -r -0 rm
  find node_modules -name "*.patch" -print0|xargs -r -0 rm
  find node_modules -iname test -type d -print0|xargs -r -0 rm -rf
  find node_modules -iname tests -type d -print0|xargs -r -0 rm -rf
  find node_modules -iname doc -type d -print0|xargs -r -0 rm -rf
  find node_modules -iname docs -type d -print0|xargs -r -0 rm -rf
  find node_modules -iname "example*" -type d -print0|xargs -r -0 rm -rf
  find node_modules -iname "readme*" -print0|xargs -r -0 rm
  find node_modules -iname "AUTHORS*" -print0|xargs -r -0 rm
  find node_modules -iname "NOTICE*" -print0|xargs -r -0 rm
  find node_modules -iname "HISTORY*" -print0|xargs -r -0 rm
  find node_modules -iname "SUMMARY.md" -print0|xargs -r -0 rm
  find node_modules -iname "PULL_REQUEST_TEMPLATE.md" -print0|xargs -r -0 rm
  find node_modules -iname "CONTRIBUTING*" -print0|xargs -r -0 rm
  find node_modules -iname "Contributors*" -print0|xargs -r -0 rm
  find node_modules -iname "CHANGES*" -print0|xargs -r -0 rm
  find node_modules -iname "CHANGELOG*" -print0|xargs -r -0 rm -rf
  find node_modules -iname "*Makefile*" -print0|xargs -r -0 rm
  find node_modules -name "*.bash_completion.*" -print0|xargs -r -0 rm
  find . -name "jsdoc.json" -print0|xargs -r -0 rm
  find . -name "SECURITY.md" -print0|xargs -r -0 rm
  find . -name "SFTPStream.md" -print0|xargs -r -0 rm
  find . -name "LIMITS.md" -print0|xargs -r -0 rm
  find . -name "GOVERNANCE.md" -print0|xargs -r -0 rm
  find . \\( -name ".git*" -type f -o  -name ".npm*" -type f \\) -print0|xargs -r -0 rm
  find . -name ".verb.md" -print0|xargs -r -0 rm
  find . -name ".nvmrc" -print0|xargs -r -0 rm
  find . -name ".travis.yml" -print0|xargs -r -0 rm
  find . -name ".jshintrc*" -print0|xargs -r -0 rm
  find . -name ".esl*" -print0|xargs -r -0 rm
  find . -name ".zuul.yml" -print0|xargs -r -0 rm
  find . -name ".doclets.yml" -print0|xargs -r -0 rm
  find . -name ".editorconfig" -print0|xargs -r -0 rm
  find . -name ".tern-project" -print0|xargs -r -0 rm
  find . -name ".dockerignore" -print0|xargs -r -0 rm
  find . -name ".dir-locals.el" -print0|xargs -r -0 rm
}

package() {
  mkdir -p \${pkgdir}${installdir}
  ( cd \${pkgdir}${installdir}
    tar -xv --transform="s/^package\\///" -f \${srcdir}/${pkg.name}-${
      pkg.version
    }.tgz)
  npx npm-pkgbuild --package \${srcdir} --output \${pkgdir} systemd
  ( cd "\${srcdir}"
    tar cf - node_modules)|(cd \${pkgdir}/{installdir};tar xf - )
}
`
  );

  out.end();

  await promisify(finished);
}
