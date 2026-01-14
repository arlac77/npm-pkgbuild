import { ContentEntry, CollectionEntry } from "content-entry";

/**
 * Source of package content.
 * @property {string} dir
 * @property {Transformer[]} transformers
 */
export class ContentProvider {
  transformers;
  entryProperties;
  directoryProperties;
  dir;

  /**
   * 
   * @param {Object} definitions 
   * @param {Array<Transformer>} [definitions.transformers]
   * @param {string} [definitions.dir]
   * @param {Object} [entryProperties]
   * @param {Objstringect} [entryProperties.destination]
   * @param {Object} [directoryProperties]
   */
  constructor(definitions, entryProperties, directoryProperties) {
    this.transformers = definitions.transformers || [];
    this.dir = definitions.dir;
    this.entryProperties = entryProperties;
    this.directoryProperties = directoryProperties;
    if (this.entryProperties?.destination) {
      this.directoryProperties = {
        ...this.directoryProperties,
        destination: this.entryProperties?.destination
      };
    }
  }

  /**
   * List all entries.
   * @return {AsyncIterable<ContentEntry|CollectionEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {}
}
