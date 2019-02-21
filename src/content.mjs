import globby from "globby";
import { join, dirname } from "path";
import { asArray, copyTemplate } from "./util";
import fs from "fs";

export async function content(context, stagingDir) {
  const pkg = context.pkg;

  if (pkg.pacman !== undefined && pkg.pacman.content !== undefined) {
    const content = context.expand(pkg.pacman.content);

    await Promise.all(
      Object.keys(content).map(async dest => {
        const source = content[dest];

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
          await fs.promises.mkdir(dirname(d), { recursive: true });

          await copyTemplate(context, join(cwd, name), d);
        }
      })
    );
  }
}
