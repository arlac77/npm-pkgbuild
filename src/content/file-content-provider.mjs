import { join } from "path";
import { FileSystemEntry } from "content-entry-filesystem";

import { globby } from "globby";
import { asArray } from "../util.mjs";

import { ContentProvider } from "./content-provider.mjs";

/**
 * content provided form the file system
 */
export class FileContentProvider extends ContentProvider {
  constructor(definitions) {
    super();

    this.content = definitions;
  }

  async *entries(context) {
    const content = context.expand(this.content);

    for (const [source, dest] of Object.entries(content)) {
      let dir, pattern;
      if (typeof dest === "string" || dest instanceof String) {
        dir = context.dir;
        pattern = source;
      } else {
        dir = join(context.dir, source.base);
        pattern = source.pattern || "**/*";
      }

      console.log(dir, pattern);
      for (const name of await globby(asArray(pattern), {
        cwd: dir
      })) {
        yield new FileSystemEntry(name);
      }
    }
  }
}
