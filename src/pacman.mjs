import { join } from "path";
import fs from "fs";
import { copyTemplate } from "./util.mjs";

export async function pacman(context, stagingDir) {
  const pkg = context.pkg;

  if (pkg.pacman !== undefined) {
    if (pkg.pacman.install !== undefined) {
      await fs.promises.mkdir(stagingDir, { recursive: true });

      await copyTemplate(
        context,
        join(context.dir, pkg.pacman.install),
        join(stagingDir, `${pkg.name}.install`)
      );
    }
  }
}
