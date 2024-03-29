import { dirname } from "node:path";
import { globby } from "globby";
import { FileSystemEntry } from "content-entry-filesystem";
import { asArray } from "../util.mjs";
import { ContentProvider } from "./content-provider.mjs";

const DEFAULT_PATTERN = ["**/*"];

/**
 * Content provided form the file system.
 * @param {Object|string} definitions
 * @param {string|string[]} definitions.pattern
 * @param {string} definitions.base base directory where to find the files
 */
export class FileContentProvider extends ContentProvider {
  /**
   * @return {string} name of the content provider
   */
  static get name() {
    return "files";
  }

  constructor(definitions, entryProperties) {
    super(definitions, entryProperties);

    if (typeof definitions === "string") {
      if (definitions.endsWith("/")) {
        this.definitions = {
          base: definitions,
          pattern: DEFAULT_PATTERN
        };
      } else {
        const base = dirname(definitions);
        this.definitions = {
          base,
          pattern: [definitions.substring(base.length + 1)]
        };
      }
    } else {
      this.definitions = { pattern: DEFAULT_PATTERN, ...definitions };
      this.definitions.pattern = asArray(this.definitions.pattern);
    }
  }

  toString() {
    return `${this.constructor.name}: ${this.definitions.base}, ${this.definitions.pattern} -> ${this.entryProperties.destination}`;
  }

  async *[Symbol.asyncIterator]() {
    const definitions = this.definitions;
    const base = definitions.base;

    for (const name of await globby(definitions.pattern, {
      cwd: base
    })) {
      const entry = Object.assign(
        new FileSystemEntry(name, base),
        this.entryProperties
      );

      yield this.baseProperties
        ? Object.create(entry, this.baseProperties)
        : entry;
    }
  }
}
