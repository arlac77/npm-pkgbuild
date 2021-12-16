import { dirname } from "path";
import { globby } from "globby";
import { FileSystemEntry } from "content-entry-filesystem";
import { asArray } from "../util.mjs";
import { ContentProvider } from "./content-provider.mjs";

/**
 * Content provided form the file system.
 * @param {Object|string} definitions
 * @param {string|string[]} definitions.pattern
 * @param {string} definitions.base base directory where to find the files
 */
export class FileContentProvider extends ContentProvider {
  constructor(definitions, entryProperties) {
    super();

    if (typeof definitions === "string") {
      const base = dirname(definitions);
      this.definitions = {
        base,
        pattern: [definitions.substring(base.length + 1)]
      };
    } else {
      this.definitions = { pattern: ["**/*"], ...definitions };
      this.definitions.pattern = asArray(this.definitions.pattern);
    }

    this.entryProperties = entryProperties;
  }

  async *[Symbol.asyncIterator]() {
    const definitions = this.definitions;
    const base = definitions.base;

    for (const name of await globby(definitions.pattern, {
      cwd: base
    })) {
      const entry = new FileSystemEntry(name, base);
      Object.assign(entry, this.entryProperties);
      yield entry;
    }
  }
}
