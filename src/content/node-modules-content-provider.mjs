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
    return "use node-modules as source";
  }

}
