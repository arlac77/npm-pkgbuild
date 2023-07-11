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

  static get description()
  {
  	return "user vercels NFT as source"
  }
  
  constructor(definitions, entryProperties) {
    super(definitions, entryProperties);

    if (typeof definitions === "string") {
      this.definitions = { start: [definitions] };
    } else {
      this.definitions = definitions;
      this.definitions.start = asArray(this.definitions.start);
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
