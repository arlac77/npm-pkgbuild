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

        for (const name of await globby(asArray(source), {
          cwd: context.dir
        })) {
          const d = dest.endsWith('/') ? join(dest,name) : dest;
          await fs.promises.mkdir(dirname(d), { recursive: true });

          await copyTemplate(context, join(context.dir, name), d);
        }
      })
    );
  }
}
