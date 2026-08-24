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
  }

  /**
   *
   * @param {string} name
   * @param {boolean} isCollection
   * @returns {Object|undefined}
   */
  propertiesFor(name, isCollection) {
    for (const [pattern, properties] of Object.entries(this.properties)) {
      if (pattern === name) {
        return properties;
      }
      if (pattern.endsWith("**/*")) {
        const prefix = pattern.substring(0, pattern.length - 4);
        if (name.startsWith(prefix)) {
          return properties;
        }
      }
      if (pattern.endsWith("*")) {
        const prefix = pattern.substring(0, pattern.length - 1);
        if (name.startsWith(prefix)) {
          if (name.substring(prefix.length).indexOf("/") < 0) {
            return properties;
          }
        }
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
