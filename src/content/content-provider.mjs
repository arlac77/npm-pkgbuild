import { ContentEntry } from "content-entry";

/**
 * Source of package content.
 * @property {string} dir
 * @property {Transformer[]} transformer
 */
export class ContentProvider {
  transformers = [];
  entryProperties;
  directoryProperties;
  dir;

  constructor(definitions, entryProperties, directoryProperties) {
    this.entryProperties = entryProperties;
    this.directoryProperties = directoryProperties;
  }

  /**
   * List all entries.
   * @return {AsyncIterable<ContentEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {}
}
