import { createWriteStream } from "fs";
import { join } from "path";
import fs from "fs";

export async function npm2pkgbuild(dir, out) {
  const pkgFile = join(dir, "package.json");
  const pkg = JSON.parse(
    await fs.promises.readFile(pkgFile, { encoding: "utf-8" })
  );

  let repo = pkg.repository.url;
  if(!repo.startsWith('git+')) {
    repo = 'git+' + repo;
  }

  out.write(
    `# ${pkg.contributors.map((c,i) => `${i?'Contributor':'Maintainer'}: ${c.name} <${c.email}>`).join('\n# ')}
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
source=(${pkg.name}::${repo})
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

  ${Object.keys(pkg.bin||{}).map(n => `install -Dm755 ${pkg.bin[n]} "\${pkgdir}/${pkg.bin[n]}"`).join('\n  ')}
  install node_modules "\${pkgdir}/node_modules"
}
`
  );

  await new Promise((resolve,reject) => {
    out.on('close', resolve);
    out.on('error', reject);
    out.end();
  });
}
