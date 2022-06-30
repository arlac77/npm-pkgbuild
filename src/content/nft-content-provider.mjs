import { dirname } from "node:path";
import { globby } from "globby";
import { nodeFileTrace } from "@vercel/nft";
import { FileSystemEntry } from "content-entry-filesystem";
import { asArray } from "../util.mjs";
import { ContentProvider } from "./content-provider.mjs";


/**
 * Content provided form the file system.
 * @param {Object|string} definitions
 * @param {string|string[]} definitions.pattern
 * @param {string} definitions.base base directory where to find the files
 */
export class NFTContentProvider extends ContentProvider {
  /**
   * @return {string} name of the content provider
   */
  static get name() {
    return "nft";
  }

  constructor(definitions, entryProperties) {
    super();

    if (typeof definitions === "string") {
      this.definitions = { start: [definitions] };
    } else {
      this.definitions = definitions;
    }

    this.entryProperties = entryProperties;

    if (this.entryProperties) {
      for (const a of ["mode"]) {
        if (this.entryProperties[a] !== undefined) {
          if (!this.baseProperties) {
            this.baseProperties = {};
          }
          this.baseProperties[a] = { value: this.entryProperties[a] };
          delete this.entryProperties[a];
        }
      }
    }
  }

  toString() {
    return `${this.constructor.name}: ${this.definitions.start} -> ${this.entryProperties.destination}`;
  }

  async *[Symbol.asyncIterator]() {
    const definitions = this.definitions;
    const base = definitions.base || process.cwd();

    const { fileList } = await nodeFileTrace(definitions.start);

    for (const name of fileList) {
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
