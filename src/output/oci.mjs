import { join } from "path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "fs";
import { aggregateFifo } from "aggregate-async-iterator";
import { Packager } from "./packager.mjs";

function into(buffer, string) {
  for (let i = 0; i <  string.length; i++) {
    buffer[i] = string.charCodeAt(i);
  }
}

export class OCI extends Packager {
  static get name() {
    return "oci";
  }

  static get description() {
    return "generate OCI container image";
  }

  static get fileNameExtension() {
    return ".oci.tar.gz";
  }

  static available() {
    return true;
  }

  get packageFileName() {
    const p = this.properties;
    return `${p.name}-${p.version}${this.constructor.fileNameExtension}`;
  }

  async execute(sources, transformer, dependencies, options, expander) {
    const { properties, destination } =
      await this.prepareExecute(options);

    const packageFile = join(destination, this.packageFileName);

    const out = createWriteStream(packageFile);

    console.log(packageFile);
    const header = new Uint8Array(512);
    const ustar = new Uint8Array(header, 256, 8);
    into(ustar, "ustar");
    
    for await (const entry of aggregateFifo(sources)) {
      into(header,entry.name);
      out.write(header);
      const stream = await entry.readStream;
      
      stream.pipe( out, { end: false});
      await new Promise((resolve,reject) => 
      {
        stream.on( 'close', () => resolve() );
        stream.on( 'error', err => reject(err));
      });
    }

    out.close();
    
    return packageFile;
  }
}
