import { join, dirname } from "path";
import { tmpdir } from "os";
import { createWriteStream } from "fs";
import { mkdtemp, mkdir, chmod } from "fs/promises";
import { pipeline } from "stream/promises";
import { execa } from "execa";
import { EmptyContentEntry } from "content-entry";
import { Packager } from "./packager.mjs";
import { keyValueTransformer } from "../key-value-transformer.mjs";

const executableAttributes = { chmod: "0775" };

const permissions = {
  "DEBIAN/preinst": executableAttributes,
  "DEBIAN/postinst": executableAttributes,
  "DEBIAN/prerm": executableAttributes,
  "DEBIAN/postrm": executableAttributes
};

export class DEB extends Packager {
  static get name() {
    return "deb";
  }

  static get fileNameExtension() {
    return ".deb";
  }

  static get fields() {
    return fields;
  }

  get packageFileName() {
    return `${this.properties.name}_${this.properties.version}_${this.properties.arch}${this.constructor.fileNameExtension}`;
  }

  async execute(options) {
    const properties = this.properties;
    const mandatoryFields = this.mandatoryFields;
    const tmp = await mkdtemp(join(tmpdir(), "deb-"));
    const staging = join(tmp, `${properties.name}-${properties.version}`);

    function* controlProperties(k, v, presentKeys) {
      if (k === undefined) {
        for (const p of mandatoryFields) {
          if (!presentKeys.has(p)) {
            const v = properties[p];
            yield [p, v === undefined ? fields[p].default : v];
          }
        }
      } else {
        yield [k, properties[k] || v];
      }
    }

    let debianControlEntry;

    for await (const entry of this.source) {
      const destName = join(staging, entry.name);

      await mkdir(dirname(destName), { recursive: true });

      if (entry.name === "DEBIAN/control") {
        debianControlEntry = entry;
      } else {
        console.log("ENTRY", entry.name, entry.basename);
        await pipeline(await entry.readStream, createWriteStream(destName));

        await Promise.all(
          Object.entries(permissions).map(async ([pattern, option]) => {
            if (destName.endsWith(pattern)) {
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

    await pipeline(
      keyValueTransformer(
        await debianControlEntry.readStream,
        controlProperties
      ),
      createWriteStream(destName)
    );

    await execa("dpkg", ["-b", staging, options.destination]);

    return join(options.destination, this.packageFileName);
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
  Architecture: {
    alias: "arch",
    type: "string",
    default: "any",
    mandatory: true
  },
  Homepage: { alias: "homepage", type: "string" },
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
