import { dirname, join, resolve } from "node:path";
import { cwd } from "node:process";
import { glob } from "node:fs/promises";
import { ContentEntry, CollectionEntry } from "content-entry";
import { FileSystemEntry } from "content-entry-filesystem";
import { asArray } from "pacc";
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

  /**
   * Content provided form the file system.
   * @param {Object|string} definitions
   * @param {string} [definitions.dir] base directory where to find the files
   * @param {string|string[]} [definitions.pattern]
   * @param {string} [definitions.destination]
   */
  constructor(definitions) {
    let dir;

    if (typeof definitions === "string") {
      dir = definitions;
      definitions = {};
    } else {
      dir = definitions.dir;
    }

    if (dir.endsWith("/")) {
      definitions.dir = dir.substring(0, dir.length - 1);
    } else if (!definitions.pattern) {
      definitions.dir = dirname(dir);
      definitions.pattern = [dir.substring(definitions.dir.length + 1)];
    }

    definitions.dir = resolve(cwd(), definitions.dir);

    super(definitions);

    this.pattern = definitions.pattern
      ? asArray(definitions.pattern)
      : DEFAULT_PATTERN;
  }

  get isPatternMatch() {
    return this.pattern.find(p => p.match(/[\*\?]/));
  }

  toString() {
    return `${this.constructor.name}: ${this.dir}, ${this.pattern} -> ${this.destination}`;
  }

  /**
   * @return {AsyncIterable<ContentEntry|CollectionEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {
    const baseDir = this.dir;
    const startPos = baseDir.length + 1;

    let count = 0;
    for await (const entry of glob(this.pattern, {
      cwd: baseDir,
      withFileTypes: true
    })) {
      const name = join(entry.parentPath, entry.name).substring(startPos);
      if (entry.isFile()) {
        yield new FileSystemEntry(name, {
          ...this.propertiesFor(name, false),
          baseDir
        });
        count++;
      } else if (entry.isDirectory()) {
        yield new CollectionEntry(name, this.propertiesFor(name, true));
        count++;
      }
    }

    if (!this.isPatternMatch && count < 1) {
      const file = join(baseDir, this.pattern[0]);
      throw new Error(`File not found ${file}`, { cause: file });
    }
  }
}
