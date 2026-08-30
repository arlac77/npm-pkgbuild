import picomatch from "picomatch";
import { ContentEntry, CollectionEntry } from "content-entry";

/**
 * Source of package content.
 * @property {string} dir
 * @property {string} destination
 * @property {Object} defaultProperties
 * @property {Map<Object,Object>} permissions
 */
export class ContentProvider {
  dir;
  defaultProperties;

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
        const entries = definitions.permissions.entries
          ? definitions.permissions.entries()
          : Object.entries(definitions.permissions);

        this.permissions = new Map(
          entries.map(([pattern, properties]) => [
            picomatch(pattern),
            properties
          ])
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
   * @returns {Object}
   */
  propertiesFor(name, isCollection) {
    if (this.permissions) {
      for (const [matcher, properties] of this.permissions) {
        if (matcher(name)) {
          /*console.log("A",name, {
            mode: properties.mode,
            user: properties.user,
            group: properties.group,
            destination: this.destination
          });*/
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
