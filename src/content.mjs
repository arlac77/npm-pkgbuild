import globby from "globby";
import { join, resolve, basename, dirname } from "path";
import { asArray, copyTemplate } from "./util";
import fs from "fs";

export async function content(context, stagingDir) {
  const pkg = context.pkg;

  if (pkg.pacman !== undefined && pkg.pacman.content !== undefined) {
    const content = pkg.pacman.content;

    await Promise.all(
      Object.keys(content).map(async dest => {
        const source = content[dest];

        dest = join(
          stagingDir,
          dest.replace(
            /\$\{([^\}]+)\}/,
            (match, key) => context.properties[key]
          )
        );

        await fs.promises.mkdir(dirname(dest), { recursive: true });

        for (const name of await globby(asArray(source), {
          cwd: context.dir
        })) {
          await copyTemplate(context, join(context.dir, name), dest);
        }
      })
    );
  }
}
