import { ContentProvider } from "./content-provider.mjs";

/**
 * Content from node_modules
 */
export class NodeModulesContentProvider extends ContentProvider {

  static get name()
  {
  	return "node-modules";
  }
}
