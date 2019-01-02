import { join } from "path";
import { copyTemplate } from "./util";

export async function pacman(context, stagingDir) {
  const pkg = context.pkg;

  if (pkg.pacman.install !== undefined) {
    await copyTemplate(
      context,
      join(context.dir, pkg.pacman.install),
      join(stagingDir, `${pkg.name}.install`)
    );
  }
}
