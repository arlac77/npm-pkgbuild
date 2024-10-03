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
    if (entryProperties) {
      this.entryProperties = entryProperties;

      for (const a of ["mode"]) {
        if (this.entryProperties[a] !== undefined) {
          if (!this.baseProperties) {
            this.baseProperties = {};
          }
          this.baseProperties[a] = { value: this.entryProperties[a] };
          delete this.entryProperties[a];
        }
      }
    }
  }

  /**
   * @return {string|undefined}
   */
  get destinationPrefix()
  {
    return undefined;
  }

  /**
   * List all entries.
   * @return {AsyncIterable<ContentEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {
  }
}
