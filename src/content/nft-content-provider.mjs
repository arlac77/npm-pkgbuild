import { nodeFileTrace } from "@vercel/nft";
import { ContentEntry } from "content-entry";
import { FileSystemEntryWithPermissions } from "./file-system-entry-with-permissions.mjs";
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

  static get description() {
    return "user vercels NFT as source";
  }

  constructor(definitions, entryProperties, directoryProperties) {
    super(definitions, entryProperties, directoryProperties);

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

  /**
   * @return {AsyncIterable<ContentEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {
    const definitions = this.definitions;
    const base = definitions.base || process.cwd();

    const { fileList } = await nodeFileTrace(definitions.start);

    for (const name of fileList) {
      yield new FileSystemEntryWithPermissions(
        name,
        base,
        this.entryProperties
      );
    }
  }
}
