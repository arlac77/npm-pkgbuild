import picomatch from "picomatch";
import { ContentEntry, CollectionEntry } from "content-entry";

/**
 * Source of package content.
 * @property {string} dir
 */
export class ContentProvider {
  entryProperties;
  directoryProperties;
  dir;
  properties;

  /**
   *
   * @param {Object} definitions
   * @param {string} [definitions.dir]
   * @param {Object} [definitions.properties]
   * @param {Object} [entryProperties]
   * @param {string} [entryProperties.destination]
   * @param {Object} [directoryProperties]
   */
  constructor(definitions, entryProperties, directoryProperties) {
    this.dir = definitions.dir;
    this.properties = definitions.properties ?? {};
    this.entryProperties = entryProperties;
    this.directoryProperties = directoryProperties;
    if (this.entryProperties?.destination) {
      this.directoryProperties = {
        ...this.directoryProperties,
        destination: this.entryProperties?.destination
      };
    }

    this.permissions = new Map(
      Object.entries(this.properties).map(([pattern, properties]) => [
        picomatch(pattern),
        properties
      ])
    );
  }

  /**
   *
   * @param {string} name
   * @param {boolean} isCollection
   * @returns {Object|undefined}
   */
  propertiesFor(name, isCollection) {
    for (const [matcher, properties] of this.permissions) {
      if (matcher(name)) {
        return isCollection && properties.collection
          ? properties.collection
          : properties;
      }
    }

    if (isCollection) {
      return this.directoryProperties;
    }
    return this.entryProperties;
  }

  /**
   * List all entries.
   * @return {AsyncIterable<ContentEntry|CollectionEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {}
}
