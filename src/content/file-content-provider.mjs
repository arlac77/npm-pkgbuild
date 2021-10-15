import { globby } from "globby";
import { FileSystemEntry } from "content-entry-filesystem";
import { asArray } from "../util.mjs";
import { ContentProvider } from "./content-provider.mjs";

/**
 * Content provided form the file system.
 */
export class FileContentProvider extends ContentProvider {
  constructor(definitions) {
    super();

    this.definitions = definitions;
  }

  async *entries() {
    const definitions = this.definitions;

    const base = definitions.base;
    const pattern = asArray(definitions.pattern || "**/*");

    for (const name of await globby(pattern, {
      cwd: base
    })) {
      yield new FileSystemEntry(name, base);
    }
  }
}
