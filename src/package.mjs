import { constants } from "node:fs";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { globbyStream } from "globby";
import { utf8StreamOptions } from "./util.mjs";

const pkgEntriesToBeRemoved = [
  "version",
  "name",
  "dependencies",
  "jspm",
  "jsnext:main",
  "man",
  "files",
  "directories",
  "devDependencies",
  "bundleDependencies",
  "peerDependencies",
  "optionalDependencies",
  "sideEffects",
  "pika",
  "private",
  "publishConfig",
  "repository",
  "license",
  "licenses",
  "changelog",
  "keywords",
  "homepage",
  "bugs",
  "scripts",
  "types",
  "deprecated",
  "description",
  "decription",
  "engines",
  "engine",
  "author",
  "authors",
  "contributors",
  "maintainers",
  "verb",
  "xo",
  "prettier",
  "jest",
  "remarkConfig",
  "nyc",
  "ava",
  "publishConfig",
  "typeScriptVersion",
  "typesPublisherContentHash",
  "typings",
  "systemd",
  "pacman",
  "lintDeps",
  "icon",
  "config",
  "release",
  "template",
  "spm",
  "precommit.silent",
  "greenkeeper",
  "bundlesize",
  "standard",
  "ignore",
  "ender",
  "dojoBuild",
  "component",
  "eslintConfig",
  "env",
  "commitlint",
  "standard-version",
  "lint-staged",
  "lintStaged",
  "ci",
  "husky",
  "verbiage",
  "os",
  "gypfile",
  "coordinates",
  "tap",
  "typesVersions",
  "node-gyp-build-optional",
  "node-gyp-build-test",
  "gitHead",
  "hallmark",
  "pacman"
];

const skipPattern = [
  "./node_modules",
  "./package.json",
  "**package-lock.json",
  "**yarn.lock",
  "**/COPYING",
  ".git*",
  "**.npm*",
  "**rollup.config.*",
  "**.travis.yml",
  "**~",
  "**.bak",
  "**.log",
  "**.mk",
  "**.bat",
  "**.tmp",
  "**.orig",
  "**/*.d.ts",
  "**.1",
  "**.patch",
  "**.cc",
  "**.c",
  "**.h",
  "**.h.in",
  "**.cmake",
  "**.gyp",
  "**.jshintrc*",
  "**.esl*",
  "**.zuul.yml",
  "**.doclets.yml",
  "**.editorconfig",
  "**.tern-project",
  "**.dockerignore",
  "**.dir-locals.el",
  "**appveyor.yml",
  "**gulpfile.js",
  "**jsdoc.json",
  "**Gruntfile.js",
  "**karma.conf.js",
  "**verb.md",
  "**.nvmrc",
  "**config.gypi",
  "**bower.json",
  "*.bash_completion.*",
  ".coveralls.yml",
  ".istanbul.yml",
  ".babelrc.*",
  ".nycrc",
  "**.DS_Store",
  ".env",
  "**.vcxproj.filters",
  "**lerna.json",
  "x-package.json5",
  "component.json",
  "tsconfig.json",
  "cypress.json",
  ".airtap.yml",
  ".jscs.json",
  "**/python3",
  "sauce-labs.svg",
  "*Makefile*",
  "CONTRIBUTING*",
  "Contributors*",
  "CHANGES*",
  "AUTHORS*",
  "NOTICE*",
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
  "example*/**",
  "doc/**",
  "docs/**",
  "**/test/**",
  "**/tests/**",
  "uritemplate-test/**",
  ".github/**",
  "**/demo/**",
  "**/coverage/**"
].map(a => "!" + a);

const defaultOptions = { dry: false };

export async function* copyNodeModules(source, dest, options = defaultOptions) {
  for await (const name of globbyStream(["node_modules/**/package.json"], {
    cwd: source
  })) {
    const pkgDir = dirname(name);
    copyNodeModule(join(source, pkgDir), join(dest, pkgDir), options);
  }
}

export async function* copyNodeModule(source, dest, options = defaultOptions) {
  const pkgFile = join(source, "package.json");
  const pkg = JSON.parse(await readFile(pkgFile, utf8StreamOptions));

  for (const key of Object.keys(pkg)) {
    if (key[0] === "_" || pkgEntriesToBeRemoved.indexOf(key) >= 0) {
      delete pkg[key];
    }
  }

  const skip = [...skipPattern];

  ["types", "unpkg", "shim", "browser", "testling", "source"].map(key => {
    iterate(pkg[key], o => skip.push(`!${o}`));
    delete pkg[key];
  });

  if (Object.keys(pkg).length !== 0 && pkg.type !== "module") {
    const pd = join(dest, "package.json");
    if (!options.dry) {
      await mkdir(dest, { recursive: true });
      await writeFile(pd, JSON.stringify(pkg), utf8StreamOptions);
    }
    yield pd;
  }

  for await (const f of globbyStream(["**", ...skip], {
    cwd: dirname(pkgFile)
  })) {
    if (
      f.match(/(readme|changelog|history|license(-\w+)?|licence)(\.\w*)?$/i)
    ) {
      continue;
    }

    const d = join(dest, f);
    if (!options.dry) {
      await mkdir(dest, { recursive: true });
      await copyFile(join(source, f), d, constants.COPYFILE_FICLONE);
    }
    yield join(d);
  }
}

function iterate(o, cb) {
  switch (typeof o) {
    case "string":
      return cb(o);
  }

  if (Array.isArray(o)) {
    for (const x of o) {
      iterate(x, cb);
    }
  }
  for (const k in o) {
    iterate(o[k], cb);
  }
}
