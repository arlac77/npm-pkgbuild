import { ContentProvider } from "./content-provider.mjs";

/**
 * content from node_modules
 */
export class NodeModulesContentProvider extends ContentProvider {
  async * entries() {}
}
