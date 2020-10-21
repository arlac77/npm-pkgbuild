import { ContentProvider } from "./content-provider.mjs";
import pack from "libnpmpack";

/**
 * content from npm pack
 */
export class NPMPack extends ContentProvider {
  async * entries(context) {
    const tarballData = await pack(context.dir);
    yield tarballData;
  }
}
