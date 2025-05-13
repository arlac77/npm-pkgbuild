import { dirname, join, resolve } from "node:path";
import { cwd } from "node:process";
import { glob } from "node:fs/promises";
import { ContentEntry, CollectionEntry } from "content-entry";
import { FileSystemEntry } from "content-entry-filesystem";
import { asArray } from "../util.mjs";
import { ContentProvider } from "./content-provider.mjs";

const DEFAULT_PATTERN = ["**/*", "!.*"];

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

  static get description() {
    return "use plain files source";
  }

  constructor(definitions, entryProperties, directoryProperties) {
    super(definitions, entryProperties, directoryProperties);

    if (typeof definitions === "string") {
      if (definitions.endsWith("/")) {
        this.definitions = {
          base: definitions.substring(0, definitions.length - 1),
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

    this.definitions.base = resolve(cwd(), this.definitions.base);
  }

  get isPatternMatch() {
    return this.definitions.pattern.find(p => p.match(/[\*\?]/));
  }

  toString() {
    return `${this.constructor.name}: ${this.definitions.base}, ${this.definitions.pattern} -> ${this.entryProperties?.destination}`;
  }

  /**
   * @return {AsyncIterable<ContentEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {
    const definitions = this.definitions;
    const baseDir = definitions.base;
    const startPos = baseDir.length + 1;

    let count = 0;
    for await (const entry of glob(definitions.pattern, {
      cwd: baseDir,
      withFileTypes: true
    })) {
      const name = join(entry.parentPath, entry.name).substring(startPos);

      if (entry.isFile()) {
        yield new FileSystemEntry(name, {
          ...this.entryProperties,
          baseDir
        });
        count++;
      } else if (entry.isDirectory()) {
        yield new CollectionEntry(name, this.directoryProperties);
        count++;
      }
    }

    if (!this.isPatternMatch && count < 1) {
      const file = join(baseDir, this.definitions.pattern[0]);
      const error = new Error(`File not found ${file}`);
      error.file = file;
      throw error;
    }
  }
}
