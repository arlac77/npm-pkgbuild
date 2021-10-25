import { join, dirname } from "path";
import { tmpdir } from "os";
import { createWriteStream } from "fs";
import { mkdtemp, mkdir, chmod } from "fs/promises";
import { pipeline } from "stream/promises";
import execa from "execa";
import { EmptyContentEntry } from "content-entry";
import { Packager } from "./packager.mjs";
import { keyValueTransformer } from "../key-value-transformer.mjs";

const permissions = {
  "DEBIAN/preinst": { chmod: "0775" },
  "DEBIAN/postinst": { chmod: "0775" },
  "DEBIAN/prerm": { chmod: "0775" },
  "DEBIAN/postrm": { chmod: "0775" }
};

export class Deb extends Packager {
  static get name() {
    return "deb";
  }

  static get fileNameExtension() {
    return ".deb";
  }

  async execute() {
    const properties = this.properties;

    Object.entries(fields).forEach(([k, v]) => {
      const e = properties[v.alias];
      if (e !== undefined) {
        properties[k] = e;
      }
    });

    const tmp = await mkdtemp(join(tmpdir(), "deb-"));
    const staging = join(tmp, `${properties.name}-${properties.version}`);

    const mandatoryProperties = new Set(
      Object.entries(fields)
        .filter(([k, v]) => v.mandatory)
        .map(([k, v]) => k)
    );

    function* controlProperties(k, v, presentKeys) {
      if (k === undefined) {
        for (const p of mandatoryProperties) {
          if (!presentKeys.has(p)) {
            const v = properties[p];
            yield [p, v === undefined ? fields[p].default : v];
          }
        }
      } else {
        yield [k, properties[k] || v];
      }
    }

    const output = `${staging}${this.constructor.fileNameExtension}`;

    let debianControlEntry;

    for await (const entry of this.source) {
      const destName = join(staging, entry.name);

      await mkdir(dirname(destName), { recursive: true });

      if (entry.name === "DEBIAN/control") {
        debianControlEntry = entry;
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

    if (!debianControlEntry) {
      debianControlEntry = new EmptyContentEntry("DEBIAN/control");
    }

    let destName = join(staging, debianControlEntry.name);

    await mkdir(dirname(destName), { recursive: true });

    const x = await pipeline(
      keyValueTransformer(
        await debianControlEntry.getReadStream(),
        controlProperties
      ),
      createWriteStream(destName)
    );

    await execa("dpkg", ["-b", staging]);

    return output;
  }
}

/**
 * @see https://www.debian.org/doc/debian-policy/ch-controlfields.html
 * @ https://linux.die.net/man/5/deb-control
 */

const fields = {
  Package: { alias: "name", type: "string", mandatory: true },
  Version: { alias: "version", type: "string", mandatory: true },
  Maintainer: { alias: "maintainer", type: "string", mandatory: true },
  Description: { alias: "description", type: "string", mandatory: true },
  Section: { type: "string", recommended: true },
  Priority: { type: "string", recommended: true },
  Essential: { type: "boolean" },
  Origin: { type: "string" },
  Architecture: { type: "string", default: "any", mandatory: true },
  Homepage: { alias: "homepage", type: "string", },
  Bugs: { alias: "bugs", type: "string" },
  Depends: { alias: "depends", type: "packageList" },
  Recommends: { type: "packageList" },
  Suggests: { type: "packageList" },
  Provides: { type: "packageList" },
  Breaks: { type: "packageList" },
  Replaces: { type: "packageList" },

  Source: {},
  Uploaders: { mandatory: false },
  "Installed-Size": {}
};
