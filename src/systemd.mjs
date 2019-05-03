import globby from "globby";
import { join, basename } from "path";
import fs from "fs";
import { asArray, copyTemplate } from "./util.mjs";

export async function systemd(context, stagingDir) {
  const pkg = context.pkg;

  if (pkg.systemd !== undefined && pkg.systemd.units !== undefined) {
    const units = context.expand(pkg.systemd.units);

    context.properties.units = units;

    await Promise.all(
      Object.keys(units).map(async unitName => {
        const unit = units[unitName];

        context.properties.unit = unitName;

        const destDir = join(stagingDir, "/usr/lib/systemd/system");
        await fs.promises.mkdir(destDir, { recursive: true });

        for (const name of await globby(asArray(unit), {
          cwd: context.dir
        })) {
          await copyTemplate(
            context,
            join(context.dir, name),
            join(destDir, basename(name))
          );
        }
      })
    );
  }
}
