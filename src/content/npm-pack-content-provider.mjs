import { pipeline } from "stream/promises";
import { createGunzip } from "zlib";
import pacote from "pacote";
import tar from "tar-stream";
import { ContentProvider } from "./content-provider.mjs";
import { BufferContentEntry } from "content-entry";

/**
 * Content from npm pack.
 */
export class NPMPackContentProvider extends ContentProvider {
  /**
   * @return {string} name of the content provider
   */
  static get name() {
    return "npm-pack";
  }

  static get description() {
    return "use npm pack as source";
  }

  constructor(definitions) {
    super();
    Object.assign(this, definitions);
  }

  async *[Symbol.asyncIterator]() {
    console.log("pacote", this.dir);

    const entries = [];

    await pacote.tarball.stream(this.dir, async stream => {
      const extract = tar.extract();

      extract.on("entry", async (header, stream, next) => {
        // console.log(header);
        stream.on("end", () => next());

        const chunks = [];
        for await (const chunk of await stream) {
          chunks.push(chunk);
        }

        console.log(header.name.substring);

        entries.push(
          new BufferContentEntry(
            header.name.substring(8),
            Buffer.concat(chunks)
          )
        );

        stream.resume();
      });

      await pipeline(stream, createGunzip(), extract);
    });

    for (const entry of entries) {
      yield entry;
    }
  }
}
