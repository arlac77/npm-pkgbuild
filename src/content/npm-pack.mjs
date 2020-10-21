import { ContentProvider } from "./content-provider.mjs";
import pack from "libnpmpack";

/**
 * content from npm pack
 */
export class NPMPack extends ContentProvider {
  async processContent() {
    const tarballData = await pack();
    console.log(tarballData);
  }
}
