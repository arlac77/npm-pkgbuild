import { ContentProvider } from "./content-provider.mjs";

/**
 * Content from node_modules
 */
export class NodeModulesContentProvider extends ContentProvider {
  /**
   * @return {string} name of the content provider
   */
  static get name() {
    return "node-modules";
  }

  static get description()
  {
    return "use node_modules as source";
  }

  constructor(definitions) {
    super();
    Object.assign(this, definitions);
  }

  async *[Symbol.asyncIterator]() {
    for (const name of await globby("**/*", {
      cwd: this.dir
    })) {
      const entry = new FileSystemEntry(name, base);
      yield entry;
    }
  }
}
