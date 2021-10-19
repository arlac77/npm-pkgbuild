import execa from "execa";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { createWriteStream } from "fs";
import { mkdtemp, mkdir, chmod } from "fs/promises";
import { pipeline } from "stream/promises";
import { Packager } from "./packager.mjs";
import { keyValueTransformer } from "../key-value-transformer.mjs";
import { globby } from "globby";

const permissions = {
  "**/DEBIAN/postinst": { chmod: "+x" }
};

export class Deb extends Packager {
  async execute() {
    this.properties.Package = this.properties.name;
    this.properties.Version = this.properties.version;

    const tmp = await mkdtemp(join(tmpdir(), "deb-"));
    const staging = join(
      tmp,
      `${this.properties.name}-${this.properties.version}`
    );

    const output = `${staging}.deb`;

    for await (const entry of this.source) {
      const destName = join(staging, entry.name);

      await mkdir(dirname(destName), { recursive: true });

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

        await Promise.all(
          Object.entries(permissions).map(async ([pattern, option]) => {
            const files = await globby(pattern);
            console.log("CHMOD", option.chmod, pattern, ...files);
            return Promise.all(files.map(f => chmod(f, option.chmod)));
          })
        );
      }
    }

    await execa("dpkg", ["-b", staging]);

    return output;
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
