import { ContentEntry } from "content-entry";

/**
 * Source of package content.
 * @property {string} dir
 */
export class ContentProvider {
  /**
   * List all entries.
   * @return {AsyncIterator<ContentEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {
  }
}
