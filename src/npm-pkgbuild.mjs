import { createWriteStream } from "fs";
import { join } from "path";
import { promisify } from 'util';
import { finished } from 'stream';
import fs from "fs";

export async function npm2pkgbuild(dir, out, options = {}) {
  const installdir = options.installdir || '/';

  const pkgFile = join(dir, "package.json");
  const pkg = JSON.parse(
    await fs.promises.readFile(pkgFile, { encoding: "utf-8" })
  );

  let repo = pkg.repository.url;
  if(!repo.startsWith('git+')) {
    repo = 'git+' + repo;
  }

  const properties = {
    url: pkg.homepage,
    pkgdesc: pkg.description,
    license: pkg.license,
    pkgrel: 1,
    pkgname : pkg.name
    arch: 'any',
    makedependes : 'git',
    dependes: 'nodejs',
    source: repo,
    md5sums : 'SKIP',
    install: options.installHook
  };

  out.write(
    `# ${pkg.contributors.map((c,i) => `${i?'Contributor':'Maintainer'}: ${c.name} <${c.email}>`).join('\n# ')}
pkgver=${pkg.version.replace(/[\w\-]+$/,'')}
epoch=
groups=()
optdepends=()
provides=()
conflicts=()
replaces=()
backup=()
options=()
${Object.keys(properties).filter(k=>properties[k]!==undefined).map(k=> `${k}='${properties[k]}'`).join('\n')}
changelog=
noextract=()
validpgpkeys=()

pkgver() {
  cd "$pkgname"
  printf "r%s.%s" "$(git rev-list --count HEAD)" "$(git rev-parse --short HEAD)"
}

build() {
  cd "${pkg.name}"
  npm install
  npm prune --production
  find . -name "*~" -print0|xargs -r -0 rm
  find node_modules -name "*.1" -print0|xargs -r -0 rm
  find node_modules -name "*.patch" -print0|xargs -r -0 rm
  find node_modules -iname test -type d -print0|xargs -r -0 rm -rf
  find node_modules -iname tests -type d -print0|xargs -r -0 rm -rf
  find node_modules -iname doc -type d -print0|xargs -r -0 rm -rf
  find node_modules -iname docs -type d -print0|xargs -r -0 rm -rf
  find node_modules -iname example -type d -print0|xargs -r -0 rm -rf
  find node_modules -iname examples -type d -print0|xargs -r -0 rm -rf
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
  find node_modules -iname "Makefile*" -print0|xargs -r -0 rm
  find node_modules -name "*.bash_completion.*" -print0|xargs -r -0 rm
  find . -name "jsdoc.json" -print0|xargs -r -0 rm
  find . -name "SECURITY.md" -print0|xargs -r -0 rm
  find . -name "SFTPStream.md" -print0|xargs -r -0 rm
  find . -name "LIMITS.md" -print0|xargs -r -0 rm
  find . -name ".gitignore" -print0|xargs -r -0 rm
  find . -name ".gitmodules" -print0|xargs -r -0 rm
  find . -name ".verb.md" -print0|xargs -r -0 rm
  find . -name ".npmignore" -print0|xargs -r -0 rm
  find . -name ".travis.yml" -print0|xargs -r -0 rm
  find . -name ".jshintrc" -print0|xargs -r -0 rm
  find . -name ".eslintrc" -print0|xargs -r -0 rm
  find . -name ".eslintignore" -print0|xargs -r -0 rm
  find . -name ".nvmrc" -print0|xargs -r -0 rm
  find . -name ".zuul.yml" -print0|xargs -r -0 rm
  find . -name ".doclets.yml" -print0|xargs -r -0 rm
  find . -name ".editorconfig" -print0|xargs -r -0 rm
  find . -name ".gitattributes" -print0|xargs -r -0 rm
  find . -name ".tern-project" -print0|xargs -r -0 rm
  find . -name ".dockerignore" -print0|xargs -r -0 rm
  find . -name ".dir-locals.el" -print0|xargs -r -0 rm
}

package() {
  mkdir -p "\${pkgdir}/${installdir}"
  (cd "\${srcdir}/${pkg.name}";tar cf - * )|(cd "\${pkgdir}/${installdir}";tar xf - )
}
`
  );

  out.end();

  await promisify(finished);
}
