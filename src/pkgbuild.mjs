import fs from "fs";
import { promisify } from "util";
import { finished } from "stream";
import { quote } from "./util.mjs";

const pacmanKeys = ["arch", "backup", "groups"];

export async function pkgbuild(context, stagingDir, out, options = {}) {
  const pkg = { contributors: [], pacman: {}, ...context.pkg };

  pkg.pacman = { depends: {}, ...pkg.pacman };

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

  const depends = makeDepends({ ...pkg.engines });

  const properties = {
    url: pkg.homepage,
    pkgdesc: pkg.description,
    license: pkg.license,
    pkgrel: context.properties.pkgrel,
    pkgver: context.properties.pkgver.replace(/\-.*$/, ""),
    pkgname: context.properties.name,
    install: pkg.pacman.hooks,
    arch: "any",
    makedepends: "git",
    source,
    md5sums,
    depends
  };

  if (properties.install !== undefined || properties.hooks !== undefined) {
    properties.install = `${context.properties.name}.install`;
  }

  const installdir = context.properties.installdir;

  pacmanKeys.forEach(k => {
    const v = pkg.pacman[k];
    if (v !== undefined) {
      properties[k] = v;
    }
  });

  [
    ...pacmanKeys,
    "depends",
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

  let pkgver = "";

  if (context.properties.pkgver === "0.0.0-semantic-release") {
    pkgver = `
pkgver() {
  cd "$pkgname"
  printf "r%s.%s" "$(git rev-list --count HEAD)" "$(git rev-parse --short HEAD)"
}
`;
  }

  let npmOrYarn = "npm";
  try {
    const s = await fs.promises.stat("yarn.lock");
    npmOrYarn = "yarn";
  } catch (e) {}

  const npmDistPackage = options.npmDist
    ? `( cd \${pkgdir}${installdir}
    tar -x --transform="s/^package\\///" -f \${srcdir}/\${pkgname}${directory}/${context.properties.name}-${context.properties.pkgver}.tgz)`
    : "";

  const npmModulesPackage = options.npmModules
    ? `( cd \${srcdir}/\${pkgname}${directory}
    tar cf - node_modules)|(cd \${pkgdir}${installdir};tar xf - )`
    : "";

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
  ${npmOrYarn} install
  npm pack
  npm prune --production
  rm -rf node_modules/.bin
  #arch=$(file -b  $(which node)|cut -d',' -f2)
  find . -name "*.node"|xargs -r file|grep -v ELF|sed 's/:.*//'|xargs -r rm
  ${cleanup.map(c => findAndDelete(c.pattern, c.dir, c.options)).join("\n")}
}

package() {
  depends=(${makeDepends(pkg.pacman.depends)
    .map(a => `"${a}"`)
    .join(" ")})

  mkdir -p \${pkgdir}${installdir}
  ${npmDistPackage}
  ${npmModulesPackage}
  npx npm-pkgbuild --package \${srcdir}/\${pkgname}${directory} --staging \${pkgdir} cleanup content systemd
}
`
  );

  out.end();

  await promisify(finished);
}

const cleanup = [
  {
    options: { filesOnly: true, ignoreCase: true },
    pattern: ["LICENSE", "LICENCE", "COPYING"]
  },
  {
    options: { ignoreCase: true, recursive: true },
    pattern: [
      "CHANGELOG*",
      "example*",
      "doc",
      "docs",
      "test",
      "tests",
      "uritemplate-test",
      ".github",
      ".vscode",
      "demo",
      "coverage"
    ]
  },
  {
    options: { filesOnly: true },
    dir: "node_modules",
    pattern: [".git*", ".npm*", "rollup.config.*", ".travis.yml"]
  },
  {
    options: { filesOnly: true },
    pattern: [
      "*~",
      "*.bak",
      "*.mk",
      "*.bat",
      "*.tmp",
      "*.log",
      "*.orig",
      "*.d.ts*",
      "*.1",
      "*.patch",
      "*.cc",
      "*.c",
      "*.h",
      "*.h.in",
      "*.cmake",
      "*.gyp",
      ".jshintrc*",
      ".esl*",
      ".zuul.yml",
      ".doclets.yml",
      ".editorconfig",
      ".tern-project",
      ".dockerignore",
      ".dir-locals.el",
      "appveyor.yml",
      "yarn.lock",
      "gulpfile.js",
      "jsdoc.json",
      "Gruntfile.js",
      "karma.conf.js",
      "verb.md",
      ".nvmrc",
      "config.gypi",
      "bower.json",
      "*.bash_completion.*",
      ".coveralls.yml",
      ".istanbul.yml",
      ".babelrc.*",
      ".nycrc",
      ".DS_Store",
      ".env",
      "x-package.json5",
      "component.json",
      "tsconfig.json",
      "cypress.json",
      ".airtap.yml",
      ".jscs.json",
      "sauce-labs.svg"
    ]
  },
  {
    options: { ignoreCase: true },
    dir: "node_modules",
    pattern: [
      "*Makefile*",
      "CONTRIBUTING*",
      "Contributors*",
      "CHANGES*",
      "PATENTS*",
      "readme*.md",
      "AUTHORS*",
      "NOTICE*",
      "HISTORY*",
      "SUMMARY.md",
      "MIGRAT*.md",
      "UPGRAD*.md",
      "PULL_REQUEST_TEMPLATE.md",
      "PATTERNS.md",
      "REFERENCE.md",
      "SECURITY.md",
      "SFTPStream.md",
      "LIMITS.md",
      "GOVERNANCE.md",
      "Porting-Buffer.md",
      "chains and topics.md",
      "CODE_OF_CONDUCT*",
      "CODEOWNERS",
      "LICENSE.DOCS*"
    ]
  }/*,
  {
    dir: "node_modules",
    options: { ignoreCase: true, recursive: true },
    pattern: ["build"]
  }*/
];

function findAndDelete(
  pattern,
  dir = ".",
  options = { ignoreCase: false, recursive: false }
) {
  return (
    "find " +
    dir +
    " \\(" +
    pattern
      .map(p => ` ${options.ignoreCase ? "-iname" : "-name"} "${p}"`)
      .join(" -o") +
    (options.filesOnly ? " -type f" : "") +
    ` \\) -print0\\
    | xargs -r -0 ${options.recursive ? "rm -rf" : "rm"}`
  );
}

function makeDepends(d) {
  return Object.keys(d).reduce((a, c) => {
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

    a.push(`${mapping[c] ? mapping[c] : c}${normalizeExpression(d[c])}`);
    return a;
  }, []);
}
