import { promisify } from "util";
import { finished } from "stream";
import { quote } from "./util.mjs";

/**
 * well known package properties
 * https://www.archlinux.org/pacman/PKGBUILD.5.html
 */
 const arrayOptionsPKGBUILD = [
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
 ];

 const optionsPKGBUILD = [
   ...arrayOptionsPKGBUILD,
  "pkgver",
  "pkgrel",
  "epoch",
  "pkgdesc",
  "url",
  "install",
  "changelog"
];

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
    if(v !== undefined) {
      properties[k] = v;
    }
  });

  properties.depends = makeDepends({ ...pkg.engines });;

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
  sed -i 's/"version": ".*/"version": "${
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

  out.end();

  await promisify(finished);
}


function makeDepends(d) {
  if(d === undefined) {
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
