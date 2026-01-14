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

  base;
  pattern = DEFAULT_PATTERN;

  /**
   * Content provided form the file system.
   * @param {Object|string} definitions
   * @param {string|string[]} [definitions.pattern]
   * @param {string} [definitions.base] base directory where to find the files
   */
  constructor(definitions, entryProperties, directoryProperties) {
    super(definitions, entryProperties, directoryProperties);

    if (typeof definitions === "string") {
      if (definitions.endsWith("/")) {
        this.base = definitions.substring(0, definitions.length - 1);
        this.pattern = DEFAULT_PATTERN;
      } else {
        const base = dirname(definitions);
        this.base = base;
        this.pattern = [definitions.substring(base.length + 1)];
      }
    } else {
      this.base = definitions.base;
      if (definitions.pattern) {
        this.pattern = asArray(definitions.pattern);
      }
    }

    this.base = resolve(cwd(), this.base);
  }

  get isPatternMatch() {
    return this.pattern.find(p => p.match(/[\*\?]/));
  }

  toString() {
    return `${this.constructor.name}: ${this.base}, ${this.pattern} -> ${this.entryProperties?.destination}`;
  }

  /**
   * @return {AsyncIterable<ContentEntry|CollectionEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {
    const baseDir = this.base;
    const startPos = baseDir.length + 1;

    let count = 0;
    for await (const entry of glob(this.pattern, {
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
      const file = join(baseDir, this.pattern[0]);
      throw new Error(`File not found ${file}`, { cause: file });
    }
  }
}
