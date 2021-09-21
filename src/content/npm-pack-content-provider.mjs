import { pipeline } from "stream/promises";
import { createGunzip } from "zlib";
import pacote from "pacote";
import tar from "tar-stream";
import { ContentProvider } from "./content-provider.mjs";
import { BufferContentEntry } from "content-entry";

/**
 * content from npm pack
 */
export class NPMPackContentProvider extends ContentProvider {
  async *entries(context) {
    //const m = await pacote.manifest(context.dir);
    //console.log('got it', m);

    const entries = [];

    await pacote.tarball.stream(context.dir, async stream => {
      const extract = tar.extract();

      extract.on("entry", async (header, stream, next) => {
       // console.log(header);
        stream.on("end", () => next());

        const chunks = [];
        for await (const chunk of await stream) {
          chunks.push(chunk);
        }

        entries.push(new BufferContentEntry(header.name.substring(8), Buffer.concat(chunks)));

        stream.resume();
      });

      await pipeline(stream, createGunzip(), extract);
    });

    for (const entry of entries) {
      yield entry;
    }
  }
}
