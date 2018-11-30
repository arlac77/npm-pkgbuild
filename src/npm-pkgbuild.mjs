import { createWriteStream } from "fs";
import { join } from "path";
import fs from "fs";

export async function npm2pkgbuild(dir, out) {
  const pkgFile = join(dir, "package.json");
  const pkg = JSON.parse(
    await fs.promises.readFile(pkgFile, { encoding: "utf-8" })
  );

  out.write(
    `# Maintainer: ${pkg.contributors[0].name} <${pkg.contributors[0].email}>
pkgname=${pkg.name}
pkgrel=1
pkgver=${pkg.version}
epoch=
pkgdesc="${pkg.description}"
arch=('any')
url="${pkg.homepage}"
license=('${pkg.license}')
groups=()
depends=('nodejs')
makedepends=('git')
optdepends=()
provides=()
conflicts=()
replaces=()
backup=()
options=()
install=
changelog=
source=(${pkg.name}::${pkg.repository.url})
noextract=()
md5sums=('SKIP')
validpgpkeys=()

pkgver() {
  cd "$pkgname"
  printf "r%s.%s" "$(git rev-list --count HEAD)" "$(git rev-parse --short HEAD)"
}

package() {
  cd "${pkg.name}"
  npm install
  npm install --production
  npm prune
  nm-prune --force
}
`
  );
}
