import { createReadStream, createWriteStream, constants } from "fs";
import { mkdir, readFile, writeFile, copyFile } from "fs/promises"
import { join, dirname } from "path";
import globby from "globby";
import { iterableStringInterceptor } from "iterable-string-interceptor";

export const utf8StreamOptions = { encoding: "utf8" };

export function quote(v) {
  if (v === undefined) return "";

  if (Array.isArray(v)) {
    return "(" + v.map(x => quote(x)).join(" ") + ")";
  }
  if (typeof v === "number" || v instanceof Number) return v;

  if (typeof v === "string" || v instanceof String)
    return v.match(/^\w+$/) ? v : "'" + v + "'";
}

export function asArray(o) {
  return Array.isArray(o) ? o : [o];
}

export async function* copyFiles(source, dest, pattern) {
  for await (const name of globby.stream(asArray(pattern), {
    cwd: source
  })) {
    const d = join(dest, name);
    await mkdir(dirname(d), { recursive: true });
    await copyFile(join(source, name), d, constants.COPYFILE_FICLONE);
    yield d;
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
  "engine",
  "engines",
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
  "./package.json",
  "**package-lock.json",
  "./node_modules",
  "COPYING",
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
  "**.d.ts",
  "**.mjs.map",
  "**.js.map",
  "**.min.map",
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
  "**yarn.lock",
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
  "**lerna.json",
  "x-package.json5",
  "component.json",
  "tsconfig.json",
  ".airtap.yml",
  ".jscs.json",
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

/*
  "**readme*",
  "**Readme*",
  "**README*",

  "license*",
  "LICENSE*",
  "LICENCE*",

  "**CHANGELOG*",
  "**changelog.*",
  "**Changelog.*",
    "HISTORY*",
  "history*",
  "History*",
*/

export async function* copyModules(source, dest, options = { dry: false }) {
  for await (const name of globby.stream(["node_modules/**/package.json"], {
    cwd: source
  })) {
    const pkgDir = dirname(name);
    const pkgFile = join(source, name);

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
      const pd = join(dest, pkgDir, "package.json");
      if (!options.dry) {
        await mkdir(dirname(pd), { recursive: true });
        await writeFile(pd, JSON.stringify(pkg), utf8StreamOptions);
      }
      yield join(pkgDir, "package.json");
    }

    for await (const f of globby.stream(["**", ...skip], {
      cwd: dirname(pkgFile)
    })) {
      if (
        f.match(/(readme|changelog|history|license(-\w+)?|licence)(\.\w*)?$/i)
      ) {
        continue;
      }

      const d = join(dest, pkgDir, f);
      if (!options.dry) {
        await mkdir(dirname(d), { recursive: true });
        await copyFile(join(source, pkgDir, f), d, constants.COPYFILE_FICLONE);
      }
      yield join(pkgDir, f);
    }
  }
}

export async function copyTemplate(context, source, dest) {
  async function* expressionEval(
    expression,
    chunk,
    source,
    cb,
    leadIn,
    leadOut
  ) {
    const replace = context.evaluate(expression);
    if (replace === undefined) {
      yield leadIn + expression + leadOut;
    } else {
      yield replace;
    }
  }

  console.log(`cp ${source} ${dest}`);

  const out = createWriteStream(dest, utf8StreamOptions);

  for await (const chunk of iterableStringInterceptor(
    createReadStream(source, utf8StreamOptions),
    expressionEval
  )) {
    out.write(chunk);
  }

  return new Promise((resolve, reject) => {
    out.end();
    out.on("finish", () => resolve());
  });
}
