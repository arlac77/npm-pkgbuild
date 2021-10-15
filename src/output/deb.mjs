import { Packager } from "./packager.mjs";
import execa from "execa";
import { join } from "path";
import { tmpdir } from "os";
import { createWriteStream } from "fs";
import { mkdtemp } from "fs/promises";
import { pipeline } from "stream/promises";

export class Deb extends Packager {
  async execute() {
    const tmp = await mkdtemp(join(tmpdir(), "deb-"));

    for await (const entry of this.source) {
      const destName = join(tmp, entry.name);

      console.log(destName);

      await pipeline(await entry.getReadStream(), createWriteStream(destName));

      console.log("DONE");
    }

    //await execa("dpkg", ["-b"]);
  }
}
