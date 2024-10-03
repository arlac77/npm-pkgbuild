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
 * Content from node_modules.
 * Requires .npmrc or NPM_TOKEN environment
 * @property {boolean} withoutDevelpmentDependencies
 * @property {string} prefix base name out output
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

  withoutDevelpmentDependencies = true;
  prefix = "node_modules";

  constructor(definitions, entryProperties) {
    super(definitions, entryProperties);
    Object.assign(this, definitions);
  }

  toString() {
    return `${this.constructor.name}: ${this.dir} -> ${this.entryProperties.destination}`;
  }

  async *[Symbol.asyncIterator]() {
    try {
      let pkgSourceDir = this.dir;

      if (this.withoutDevelpmentDependencies) {
        pkgSourceDir = await mkdtemp(join(tmpdir(), "modules"));

        const json = JSON.parse(
          //@ts-ignore
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
            throw new Error(
              `.npmrc not found in ${searchDirs} (neither NPM_TOKEN in envinronment)`
            );
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

      const nodeModulesDir = join(pkgSourceDir, "node_modules");

      for (const name of await globby("**/*", {
        cwd: nodeModulesDir
      })) {
        if (!toBeSkipped.test(name)) {
          if (name.endsWith("package.json")) {
            try {
              const json = shrinkNPM(
                JSON.parse(
                  //@ts-ignore
                  await readFile(join(nodeModulesDir, name), utf8StreamOptions)
                )
              );

              if (json) {
                yield Object.assign(
                  new StringContentEntry(
                    join(this.prefix, name),
                    JSON.stringify(json)
                  ),
                  this.entryProperties
                );
              }

              continue;
            } catch (e) {
              console.error(e, name);
            }
          }
          console.log("FSE",join(this.prefix, name), pkgSourceDir);
          yield Object.assign(
            new FileSystemEntry(join(this.prefix, name), pkgSourceDir),
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
      "\\.d\\.cts",
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
      "\\.circle.*",
      "\\.lint.*",
      "\\.yarn.*",
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
      "Makefile(\\.am|\\.fallback|\\.msc|\\.targ)?",
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
      "nodemon\\.json",
      "\\.bash_completion.*",
      "\\.coveralls\\.yml",
      "\\.istanbul\\.yml",
      "\\.babel.*",
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
      "[\\d\\-]+\\.md",
      "DEPS",
      "__tests__",
      "\\.test\\.js",
      "__snapshots__",
      "Porting-Buffer\\.md",
      "chains and topics\\.md",
      "build_detect_platform",
      "\\.snap",
      "install_daemon_node.node",
      "tsconfig.build.json",
      "typedoc.json",
      "webpack.config.js"
    ].join("|") +
    ")$|(node_modules/(npm-pkgbuild|@types|node-addon-api|mf-hosting|node-gyp$)|(win32|android|darwin)-(ia32|x64|arm|arm64))",
  "i"
);
