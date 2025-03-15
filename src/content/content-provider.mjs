import { ContentEntry } from "content-entry";

/**
 * Source of package content.
 * @property {string} dir
 * @property {Transformer[]} transformer
 */
export class ContentProvider {
  transformers = [];
  entryProperties;
  dir;

  constructor(definitions, entryProperties) {
    this.entryProperties = entryProperties;
  }

  /**
   * List all entries.
   * @return {AsyncIterable<ContentEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {}
}
