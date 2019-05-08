import { join } from "path";
import fs, { createReadStream } from "fs";
import execa from "execa";
import { copyTemplate } from "./util.mjs";
import { utf8StreamOptions } from "./util.mjs";

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

export async function makepkg(context, stagingDir) {
  const proc = execa("makepkg", ["-f"], { cwd: stagingDir });

  let publish = context.properties.publish;

  proc.stdout.pipe(process.stdout);

  let name, version;

  for await (const chunk of proc.stderr) {
    const s = chunk.toString("utf8");

    console.log(s);

    const m = s.match(/Finished making:\s+([^\s]+)\s+([^\s]+)/);
    if (m) {
      name = m[1];
      version = m[2];
    }
  }

  const p = await proc;
  console.log(p);

  if (p.code !== 0) {
    throw new Error(`unexpected exit ${p.code} from makepkg`);
  }

  if (publish !== undefined) {
    let arch = "any";

    for await (const chunk of createReadStream(
      join(staging, `pkg/${name}/.PKGINFO`),
      utf8StreamOptions
    )) {
      const r = chunk.match(/arch\s+=\s+(\w+)/);
      if (r) {
        arch = r[1];
      }
    }

    context.properties["arch"] = arch;

    publish = publish.replace(/\{\{(\w+)\}\}/m, (match, key, offset, string) =>
      context.evaluate(key)
    );

    console.log(`cp ${name}-${version}-${arch}.pkg.tar.xz ${publish}`);

    await execa("cp", [`${name}-${version}-${arch}.pkg.tar.xz`, publish], {
      cwd: staging
    });
  }
}
