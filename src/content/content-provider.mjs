import { ContentEntry, CollectionEntry } from "content-entry";

/**
 * Source of package content.
 * @property {string} dir
 * @property {Transformer[]} transformer
 */
export class ContentProvider {
  transformers;
  entryProperties;
  directoryProperties;
  dir;

  /**
   * 
   * @param {Object} definitions 
   * @param {Array<Transformer>} [definitions.transformer]
   * @param {Object} [entryProperties]
   * @param {Object} [directoryProperties]
   */
  constructor(definitions, entryProperties, directoryProperties) {

    this.transformer = definitions.transformer || [];
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
