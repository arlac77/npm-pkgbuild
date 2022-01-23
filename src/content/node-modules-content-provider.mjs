import { tmpdir } from "os";
import { join } from "path";
import { cp, mkdtemp, readFile, writeFile } from "fs/promises";
import { globby } from "globby";
import Arborist from "@npmcli/arborist";
import { FileSystemEntry } from "content-entry-filesystem";
import { ContentProvider } from "./content-provider.mjs";
import { utf8StreamOptions } from "../util.mjs";

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
    Object.assign(this, definitions);
    this.entryProperties = entryProperties;
  }

  toString() {
    return `${this.constructor.name}: ${this.dir}`;
  }

  async *[Symbol.asyncIterator]() {
    const tmp = await mkdtemp(join(tmpdir(), "node-modules"));

    const json = JSON.parse(
      await readFile(join(this.dir, "package.json"), utf8StreamOptions)
    );
    delete json.devDependencies;
    await writeFile(
      join(tmp, "package.json"),
      JSON.stringify(json),
      utf8StreamOptions
    );

    const arb = new Arborist({ path: tmp });
    await arb.buildIdealTree({ update: true, prune: true, saveType: "prod" });
    await arb.prune({ saveType: "prod" });
    await arb.reify({ save: true });

    for (const name of await globby("node_modules/**/*", {
      cwd: tmp
    })) {
      if (
        !name.match(
          /(~|\.map|\.ts|\.orig|\.log|\.tmp|\.bak|\.bat|\.gypi|\.gyp|appveyor\.yml|yarn\.lock|\.DS_Store|jenkinsfile|\.travis\.yml|\.jshint(rc)?|\.npm.*|\.git.*|rollup\.config\.(js|mjs|cjs)|CODE_OF_CONDUCT(\.md)?|GOVERNANCE(\.md)?|CODEOWNERS(\.md)?|UPGRAD(E|ING)(\.md)?|AUTHORS(\.md)?|CONTRIBUT(ORS|ING)(.md)?|CHANGELOG(\.md)?|HISTORY(\.md)?|LICENSE(\-\w+|\.md|\.txt)?|README(.*\.md)?|\.o|\.a|\.c|\.cc|\.h|\.in|Makefile|\.cmake|\.mk|\.\d)$/i
        )
      ) {
        yield Object.assign(
          new FileSystemEntry(name, tmp),
          this.entryProperties
        );
      }
    }
  }
}

const toBeIgnored = [
  {
    pattern: [
      "*.d.ts*",
      "*.patch",
      ".jshintrc*",
      ".esl*",
      ".zuul.yml",
      ".doclets.yml",
      ".editorconfig",
      ".tern-project",
      ".dockerignore",
      ".dir-locals.el",
      "gulpfile.js",
      "jsdoc.json",
      "Gruntfile.js",
      "karma.conf.js",
      "verb.md",
      ".nvmrc",
      "bower.json",
      "*.bash_completion.*",
      ".coveralls.yml",
      ".istanbul.yml",
      ".babelrc.*",
      ".nycrc",
      ".env",
      "x-package.json5",
      "component.json",
      "tsconfig.json",
      "cypress.json",
      ".airtap.yml",
      ".jscs.json",
      "sauce-labs.svg",
      "PATENTS*",
      "NOTICE*",
      "SUMMARY.md",
      "MIGRAT*.md",
      "PULL_REQUEST_TEMPLATE.md",
      "PATTERNS.md",
      "REFERENCE.md",
      "SECURITY.md",
      "SFTPStream.md",
      "LIMITS.md",
      "Porting-Buffer.md",
      "chains and topics.md",
      "CODE_OF_CONDUCT*"
    ]
  }
];
