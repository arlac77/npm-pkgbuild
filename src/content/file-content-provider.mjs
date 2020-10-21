import { join, dirname } from "path";
import { mkdir }  from "fs/promises";

import globby from "globby";
import { asArray, copyTemplate } from "../util.mjs";

import { ContentProvider } from "./content-provider.mjs";

/**
 * content provided form the file system
 */
export class FileContentProvider extends ContentProvider {
  async processContent(context) {
    const content = context.expand(this.content);

    await Promise.all(
      Object.entries(content).map(async ([source, dest]) => {
        dest = join(stagingDir, dest);
        let cwd, pattern;

        if (typeof source === "string" || source instanceof String) {
          cwd = context.dir;
          pattern = source;
        } else {
          cwd = join(context.dir, source.base);
          pattern = source.pattern || "**/*";
        }

        for (const name of await globby(asArray(pattern), {
          cwd
        })) {
          const d = dest.endsWith("/") ? join(dest, name) : dest;
          await mkdir(dirname(d), { recursive: true });

          await copyTemplate(context, join(cwd, name), d);
        }
      })
    );
  }
}
