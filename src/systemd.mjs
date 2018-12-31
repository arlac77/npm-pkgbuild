import globby from "globby";
import { join, resolve, basename } from "path";
import { asArray, copyTemplate } from "./util";
import fs from "fs";

export async function prepareSystemdUnits(pkg, dir, stagingDir, properties) {
  if (pkg.systemd !== undefined && pkg.systemd.units !== undefined) {
    const units = pkg.systemd.units;

    properties = Object.assign({}, pkg, properties);

    await Promise.all(
      Object.keys(units).map(async unitName => {
        const unit = units[unitName];

        properties.unit = unitName;

        const destDir = join(stagingDir, "/usr/lib/systemd/system");
        await fs.promises.mkdir(destDir, { recursive: true });

        for (const name of await globby(asArray(unit), {
          cwd: dir
        })) {
          await copyTemplate(
            resolve(dir, name),
            join(destDir, basename(name)),
            properties
          );
        }
      })
    );
  }
}
