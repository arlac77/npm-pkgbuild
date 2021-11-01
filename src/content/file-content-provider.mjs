import { dirname } from "path";
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

    if (typeof definitions === "string") {
      const base = dirname(definitions);
      this.definitions = {
        base,
        pattern: [definitions.substring(base.length)]
      };
    } else {
      this.definitions = { pattern: ["**/*"], ...definitions };
      this.definitions.pattern = asArray(this.definitions.pattern);
    }
  }

  async *[Symbol.asyncIterator]() {
    const definitions = this.definitions;
    const base = definitions.base;

    for (const name of await globby(definitions.pattern, {
      cwd: base
    })) {
      yield new FileSystemEntry(name, base);
    }
  }
}
