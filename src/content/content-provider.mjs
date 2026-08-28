import picomatch from "picomatch";
import { ContentEntry, CollectionEntry } from "content-entry";

/**
 * Source of package content.
 * @property {string} dir
 */
export class ContentProvider {
  dir;

  /**
   *
   * @param {Object} definitions
   * @param {string} [definitions.dir]
   * @param {string} [definitions.destination]
   * @param {Object} [definitions.permissions]
   */
  constructor(definitions) {
    this.dir = definitions.dir;
    this.defaultProperties = { destination: definitions.destination };

    if (definitions.permissions) {
      if (
        Object.values(definitions.permissions).find(v => typeof v !== "object")
      ) {
        Object.assign(this.defaultProperties, definitions.permissions);
      } else {
        this.permissions = new Map(
          Object.entries(definitions.permissions).map(
            ([pattern, properties]) => [picomatch(pattern), properties]
          )
        );
      }
    }
  }

  get destination() {
    return this.defaultProperties.destination;
  }

  toString() {
    return `${this.constructor.name}: ${this.dir} -> ${this.destination}`;
  }

  /**
   *
   * @param {string} name
   * @param {boolean} isCollection
   * @returns {Object|undefined}
   */
  propertiesFor(name, isCollection) {
    if (this.permissions) {
      for (const [matcher, properties] of this.permissions) {
        if (matcher(name)) {
          return isCollection && properties.collection
            ? { ...properties.collection, destination: this.destination }
            : { ...properties, destination: this.destination };
        }
      }
    }

    return this.defaultProperties;
  }

  /**
   * List all entries.
   * @return {AsyncIterable<ContentEntry|CollectionEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {}
}
