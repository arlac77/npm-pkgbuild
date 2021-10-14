/**
 * Source of package content.
 */
export class ContentProvider {
  /**
   * Delivers content entries to be packed.
   * @return {asyncIterator<ContentEntry>} all entries
   */
  async *entries() {}

  /**
   * List all entries.
   * @return {asyncIterator<ContentEntry>} all entries
   */
  async *[Symbol.asyncIterator]() {
    return yield* this.entries();
  }
}
