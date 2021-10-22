import { join, dirname } from "path";
import { tmpdir } from "os";
import { createWriteStream } from "fs";
import { mkdtemp, mkdir, chmod } from "fs/promises";
import { pipeline } from "stream/promises";
import execa from "execa";
import { Packager } from "./packager.mjs";
import { keyValueTransformer } from "../key-value-transformer.mjs";

const permissions = {
  "DEBIAN/preinst": { chmod: "0775" },
  "DEBIAN/postinst": { chmod: "0775" }
};

export class Deb extends Packager {
  static get name() {
    return "deb";
  }

  static get fileNameExtension() {
    return ".deb";
  }

  async execute() {
    Object.entries(fields).forEach(([k, v]) => {
      const e = this.properties[v.alias];
      if (e !== undefined) {
        this.properties[k] = e;
      }
    });

    const tmp = await mkdtemp(join(tmpdir(), "deb-"));
    const staging = join(
      tmp,
      `${this.properties.name}-${this.properties.version}`
    );

    const presentProperties = new Set();

    const controlProperties = (k, v) => {
      presentProperties.add(k);
      return [k, this.properties[k] || v];
    };

    const mandatoryProperties = new Set(
      Object.entries(fields)
        .filter(([k, v]) => v.mandatory)
        .map(([k, v]) => k)
    );

    const output = `${staging}${this.constructor.fileNameExtension}`;

    for await (const entry of this.source) {
      const destName = join(staging, entry.name);

      await mkdir(dirname(destName), { recursive: true });

      if (entry.name === "DEBIAN/control") {
        await pipeline(
          keyValueTransformer(await entry.getReadStream(), controlProperties),
          createWriteStream(destName)
        );
      } else {
        await pipeline(
          await entry.getReadStream(),
          createWriteStream(destName)
        );

        await Promise.all(
          Object.entries(permissions).map(async ([pattern, option]) => {
            if (destName.endsWith(pattern)) {
              //console.log("CHMOD", option.chmod, destName, pattern);
              return chmod(destName, option.chmod);
            }
          })
        );
      }
    }

    //console.log(presentProperties, mandatoryProperties);

    await execa("dpkg", ["-b", staging]);

    return output;
  }
}

/**
 * @see https://www.debian.org/doc/debian-policy/ch-controlfields.html
 */

const fields = {
  Package: { alias: "name", mandatory: true },
  Version: { alias: "version", mandatory: true },
  Architecture: { default: "any", mandatory: true },
  Description: { alias: "description", mandatory: true },
  Homepage: { alias: "homepage" },
  Source: { mandatory: true },
  Maintainer: { alias: "maintainer", mandatory: true },
  Uploaders: { mandatory: false },
  Section: { recommended: true },
  Priority: { recommended: true },
  "Installed-Size": {}
};
