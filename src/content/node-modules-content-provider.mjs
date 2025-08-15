import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import Arborist from "@npmcli/arborist";
import { parse } from "ini";
import {
  ContentEntry,
  StringContentEntry,
  CollectionEntry
} from "content-entry";
import { FileSystemEntry } from "content-entry-filesystem";
import { ContentProvider } from "./content-provider.mjs";
import { utf8StreamOptions } from "../util.mjs";
import { shrinkNPM } from "../npm-shrink.mjs";

/**
 * Content from node_modules.
 * Requires .npmrc or NPM_TOKEN environment
 * @property {boolean} withoutDevelpmentDependencies
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

  constructor(definitions, entryProperties, directoryProperties) {
    if (
      entryProperties?.destination &&
      !entryProperties.destination.endsWith("/")
    ) {
      entryProperties.destination += "/";
    }
    super(definitions, entryProperties, directoryProperties);
    Object.assign(this, definitions);
  }

  toString() {
    return `${this.constructor.name}: ${this.dir} -> ${this.entryProperties.destination}`;
  }

  /**
   * List all entries.
   * @return {AsyncIterable<ContentEntry|CollectionEntry>} all entries
   */
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
      const startPos = nodeModulesDir.length + 1;

      for await (const entry of glob("**/*", {
        cwd: nodeModulesDir,
        withFileTypes: true
        /*exclude: entry =>
          toBeSkipped.test(entry.name) ||
          /@types|tslib|node-addon-api|node-gyp/.test(
            entry.parentPath.substring(startPos)
          )
          */
      })) {
        if (toBeSkipped.test(entry.name)) {
          continue;
        }

        const name = join(entry.parentPath, entry.name).substring(startPos);

        if (/@types|tslib|node-addon-api|node-gyp/.test(name)) {
          continue;
        }

        if (entry.isFile()) {
          if (entry.name === "package.json") {
            try {
              const json = shrinkNPM(
                JSON.parse(
                  //@ts-ignore
                  await readFile(
                    join(entry.parentPath, entry.name),
                    utf8StreamOptions
                  )
                )
              );

              if (json) {
                yield new StringContentEntry(
                  name,
                  this.entryProperties,
                  JSON.stringify(json)
                );
              }
              continue;
            } catch (e) {
              console.error(e, entry.name);
            }
          }

          yield new FileSystemEntry(name, {
            ...this.entryProperties,
            baseDir: nodeModulesDir
          });
        } else if (entry.isDirectory()) {
          yield new CollectionEntry(name, this.directoryProperties);
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
      "\\.m?js\\.gz",
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
      "UPGRAD(E|ING)(\\.md)?",
      "OWNERS",
      "CONTRIBUT(ORS|ING)(\\.md)?",
      "LICEN[SC]E(\\-\\w+)?(\\.txt|\\.md|\\.BSD|\\.APACHE2|\\.MIT|\\.terms)?",
      "(CODE_OF_CONDUCT|GOVERNANCE|CODEOWNERS|AUTHORS|DOCUMENTATION|CHANGES|CHANGELOG|HISTORY|ROADMAP|README|INSTALL)(.*\\.md|\\.txt)?",
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
      "webpack.config.js",
      "tsconfig.build.tsbuildinfo"
    ].join("|") +
    ")$|(win32|android|darwin)-(ia32|x64|arm|arm64)",
  "i"
);
