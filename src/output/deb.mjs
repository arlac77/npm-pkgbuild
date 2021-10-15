import { Packager } from "./packager.mjs";
import execa from "execa";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { createWriteStream } from "fs";
import { mkdtemp, mkdir } from "fs/promises";
import { pipeline } from "stream/promises";

export class Deb extends Packager {
  async execute() {
    const staging = await mkdtemp(join(tmpdir(), "deb-"));

    for await (const entry of this.source) {
      const destName = join(staging, entry.name);

      await mkdir(dirname(destName), { recursive: true });

      console.log(destName);

      await pipeline(await entry.getReadStream(), createWriteStream(destName));
    }

    await execa("dpkg", ["-b", staging]);
  }
}

/**
 * @see https://www.debian.org/doc/debian-policy/ch-controlfields.html
 */

const fields = {
  Package: { mandatory: true },
  Version: { mandatory: true },
  Source: { mandatory: true },
  Maintainer: { mandatory: true },
  Uploaders: { mandatory: false },
  Section: { recommended: true },
  Priority: { recommended: true }
};
