import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { globby } from "globby";
import Arborist from "@npmcli/arborist";
import { parse } from "ini";
import { StringContentEntry } from "content-entry";
import { FileSystemEntry } from "content-entry-filesystem";
import { ContentProvider } from "./content-provider.mjs";
import { utf8StreamOptions } from "../util.mjs";
import { shrinkNPM } from "../npm-shrink.mjs";

/**
 * Content from node_modules
 */
export class NodeModulesContentProvider extends ContentProvider {
  /**
   * @return {string} name of the content provider
   */
  static get name() {
    return "node-modules";
  }

  static get description() {
    return "use node_modules as source";
  }

  constructor(definitions, entryProperties) {
    super();
    Object.assign(this, { withoutDevelpmentDependencies: true }, definitions);
    this.entryProperties = entryProperties;
  }

  toString() {
    return `${this.constructor.name}: ${this.dir} -> ${this.entryProperties.destination}`;
  }

  async *[Symbol.asyncIterator]() {
    try {
      let pkgSourceDir = this.dir;

      if (this.withoutDevelpmentDependencies) {
        pkgSourceDir = await mkdtemp(join(tmpdir(), "node-modules"));

        const json = JSON.parse(
          await readFile(join(this.dir, "package.json"), utf8StreamOptions)
        );
        delete json.devDependencies;
        await writeFile(
          join(pkgSourceDir, "package.json"),
          JSON.stringify(json),
          utf8StreamOptions
        );

        let npmrcContent;

        const searchDirs = [pkgSourceDir, homedir()];
        for (const d of searchDirs) {
          try {
            npmrcContent = await readFile(join(d, ".npmrc"), utf8StreamOptions);
            break;
          } catch {}
        }

        let npmrc = {};

        if (npmrcContent) {
          npmrc = parse(npmrcContent);
        } else {
          if (process.env.NPM_TOKEN) {
            npmrc["_authToken"] = process.env.NPM_TOKEN;
          } else {
            throw new Error(`.npmrc not found in ${searchDirs}`);
          }
        }

        const arb = new Arborist({ path: pkgSourceDir, ...npmrc });
        await arb.buildIdealTree({
          update: true,
          prune: true,
          saveType: "prod"
        });
        await arb.prune({ saveType: "prod" });
        await arb.reify({ save: true });
      }

      for (const name of await globby("node_modules/**/*", {
        cwd: pkgSourceDir
      })) {
        if (!toBeSkipped.test(name)) {
          if (name.endsWith("package.json")) {
            try {
              const json = shrinkNPM(
                JSON.parse(
                  await readFile(join(pkgSourceDir, name), utf8StreamOptions)
                ),
                {}
              );

              if (json) {
                yield Object.assign(
                  new StringContentEntry(name, JSON.stringify(json)),
                  this.entryProperties
                );
              }

              continue;
            } catch (e) {
              console.error(e, name);
            }
          }

          yield Object.assign(
            new FileSystemEntry(name, pkgSourceDir),
            this.entryProperties
          );
        }
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}

const toBeSkipped = new RegExp(
  "(" +
    [
      "python3",
      "\\.musl\\.node",
      "package-lock.json",
      "~",
      "\\.\\d",
      "\\.map",
      "\\.umd\\.js",
      "\\.ts",
      "\\.mts",
      "\\.d\\.ts",
      "\\.debug\\.js",
      "\\.coffee",
      "tsdoc-metadata\\.json",
      "\\.orig",
      "\\.log",
      "\\.tmp",
      "\\.bak",
      "\\.bat",
      "\\.gypi",
      "\\.gyp",
      "\\.stamp",
      "\\.cs",
      "\\.cmd",
      "\\.markdown",
      "\\.sublime-project",
      "\\.sublime-workspace",
      "appveyor\\.yml",
      "seed\\.yml",
      "\\.xclangspec",
      "\\.pbfilespec",
      "yarn\\.lock",
      "\\.DS_Store",
      "jenkinsfile",
      "\\.vcxproj",
      "\\.travis\\.yml",
      "\\.jshint(rc)?",
      "\\.npm.*",
      "\\.git.*",
      "\\.tar",
      "\\.tgz",
      "\\.tar\\.gz",
      "rollup\\.config\\.(js|mjs|cjs)",
      "COPYING",
      "Copyrightnotice\\.txt",
      "Doxyfile",
      "Dockerfile",
      "CODE_OF_CONDUCT(\\.md|\\.txt)?",
      "GOVERNANCE(\\.md)?",
      "CODEOWNERS(\\.md)?",
      "UPGRAD(E|ING)(\\.md)?",
      "AUTHORS(\\.md|\\.txt)?",
      "OWNERS",
      "CONTRIBUT(ORS|ING)(\\.md)?",
      "CHANGELOG(\\.md)?",
      "CHANGES(\\.md)?",
      "HISTORY(\\.md)?",
      "ROADMAP(\\.md)?",
      "DOCUMENTATION(\\.md)?",
      "LICEN[SC]E(\\-\\w+)?(\\.txt|\\.md|\\.BSD|\\.APACHE2|\\.MIT|\\.terms)?",
      "README(.*\\.md|\\.txt)?",
      "INSTALL(.*\\.md)?",
      "\\.armv6\\.node",
      "\\.py",
      "\\.el",
      "\\.o",
      "\\.a",
      "\\.c",
      "\\.cc",
      "\\.cpp",
      "\\.h",
      "\\.in",
      "\\.vc",
      "\\.m4",
      "Makefile(\\.am|\\.fallback|\\.msc)?",
      "\\.cmake",
      "\\.mk",
      "\\.patch",
      "\\.esl*",
      "\\.zuul\\.yml",
      "\\.doclets\\.yml",
      "\\.editorconfig",
      "\\.tern-project",
      "\\.dockerignore",
      "\\.dir-locals\\.el",
      "gulpfile\\.js",
      "jsdoc\\.json",
      "Gruntfile\\.js",
      "karma\\.conf\\.js",
      "verb\\.md",
      "\\.nvmrc",
      "bower\\.json",
      "\\.bash_completion.*",
      "\\.coveralls\\.yml",
      "\\.istanbul\\.yml",
      "\\.babelrc.*",
      "\\.nycrc",
      "\\.env",
      "x-package\\.json5?",
      "component\\.json",
      "tsconfig\\.json",
      "cypress\\.json",
      "\\.airtap\\.yml",
      "\\.jscs\\.json",
      "sauce-labs\\.svg",
      "PATENTS(\\.md)?",
      "release(-notes)?\\.md",
      "NOTICE(\\.md)?",
      "SUMMARY\\.md",
      "MIGRAT.*\\.md",
      "PULL_REQUEST_TEMPLATE\\.md",
      "PATTERNS\\.md",
      "REFERENCE\\.md",
      "SECURITY\\.md",
      "SFTPStream\\.md",
      "LIMITS\\.md",
      "DEPS",
      "Porting-Buffer\\.md",
      "chains and topics\\.md",
      "build_detect_platform"
    ].join("|") +
    ")$|(node_modules/(@types|node-addon-api|mf-hosting|node-gyp$)|(win32|android|darwin)-(ia32|x64|arm|arm64))",
  "i"
);
