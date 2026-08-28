import { nodeFileTrace } from "@vercel/nft";
import { ContentEntry } from "content-entry";
import { FileSystemEntry } from "content-entry-filesystem";
import { asArray } from "pacc";
import { ContentProvider } from "./content-provider.mjs";

/**
 * Content provided form the file system.
 */
export class NFTContentProvider extends ContentProvider {
  /**
   * @return {string} name of the content provider
   */
  static get name() {
    return "nft";
  }

  static get description() {
    return "user vercels NFT as source";
  }

  /**
   * Content provided form the file system.
   * @param {Object|string} definitions
   * @param {string} definitions.start base directory where to find the files
   * @param {string} [definitions.dir]
   * @param {string} [definitions.destination]
 */
  constructor(definitions) {
    super(definitions);

    if (typeof definitions === "string") {
      this.start = [definitions];
    } else {
      this.start = asArray(definitions.start);
    }
  }

  toString() {
    return `${this.constructor.name}: ${this.start} -> ${this.destination}`;
  }

  /**
   * @return {AsyncIterable<ContentEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {
    const baseDir = this.dir || process.cwd();
    const { fileList } = await nodeFileTrace(this.start);

    for (const name of fileList) {
      yield new FileSystemEntry(
        name,
        { ...this.propertiesFor(name), baseDir }
      );
    }
  }
}
