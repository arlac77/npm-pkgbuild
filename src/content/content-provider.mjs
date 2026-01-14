import { ContentEntry, CollectionEntry } from "content-entry";

/**
 * Source of package content.
 * @property {string} dir
 */
export class ContentProvider {
  entryProperties;
  directoryProperties;
  dir;

  /**
   * 
   * @param {Object} definitions 
   * @param {string} [definitions.dir]
   * @param {Object} [entryProperties]
   * @param {string} [entryProperties.destination]
   * @param {Object} [directoryProperties]
   */
  constructor(definitions, entryProperties, directoryProperties) {
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
