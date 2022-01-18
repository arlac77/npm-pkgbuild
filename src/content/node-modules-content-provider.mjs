import { globby } from "globby";
import Arborist from "@npmcli/arborist";
import { FileSystemEntry } from "content-entry-filesystem";
import { ContentProvider } from "./content-provider.mjs";

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

  async *[Symbol.asyncIterator]() {
    const cwd = this.dir;

    const arb = new Arborist({ path: cwd });
    await arb.buildIdealTree({ saveType: "prod" });
    await arb.reify({ save: true });

    for (const name of await globby("node_modules/**/*", {
      cwd
    })) {
      yield Object.assign(new FileSystemEntry(name, cwd), this.entryProperties);
    }
  }
}

const toBeIgnored = [
  {
    options: { filesOnly: true },
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
      "*.2",
      "*.3",
      "*.4",
      "*.5",
      "*.6",
      "*.7",
      "*.8",
      "*.9",
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
  }
];
