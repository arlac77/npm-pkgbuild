import execa from "execa";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { createWriteStream } from "fs";
import { mkdtemp, mkdir } from "fs/promises";
import { pipeline } from "stream/promises";
import { Packager } from "./packager.mjs";
import { keyValueTransformer } from "../key-value-transformer.mjs";

export class Deb extends Packager {
  async execute() {
    const name = "mypkg";
    const version = "1.0.0";

    this.properties.Package = this.properties.name;
    this.properties.Version = this.properties.version;

    const x = join(tmpdir(), "deb-");

    const staging = await mkdtemp(x);

    for await (const entry of this.source) {
      const destName = join(staging, entry.name);

      await mkdir(dirname(destName), { recursive: true });

      console.log(destName);

      if (entry.name === "DEBIAN/control") {
        await pipeline(
          keyValueTransformer(await entry.getReadStream(), (k, v) => [
            k,
            this.properties[k] === undefined ? v : this.properties[k]
          ]),
          createWriteStream(destName)
        );
      } else {
        await pipeline(
          await entry.getReadStream(),
          createWriteStream(destName)
        );
      }
    }

    await execa("dpkg", ["-b", staging] /*, { cwd: x}*/);
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
  Priority: { recommended: true },
  "Installed-Size": {}
};
