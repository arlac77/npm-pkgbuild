import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import { aggregateFifo } from "aggregate-async-iterator";
import {
  keyValueTransformer,
  equalSeparatedKeyValuePairOptions
} from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { analysePublish } from "../publish.mjs";
import {
  fieldProvider,
  copyEntries,
  utf8StreamOptions,
  quote,
  filterOutUnwantedDependencies
} from "../util.mjs";

const DOCKERFILE = "Dockerfile";

function* keyValueLines(key, value, options) {
  yield `LABEL ${quote(key, '"')}=${quote(value, '"')}${options.lineEnding}`;
}

const labelKeyValuePairs = {
  ...equalSeparatedKeyValuePairOptions,
  keyValueLines
};

const dependenciesToFrom = {
  node: "node",
  "nginx-mainline": "nginx",
  nginx: "nginx"
};

export class DOCKER extends Packager {
  static get name() {
    return "docker";
  }

  static get description() {
    return `generate container image with ${this.name}`;
  }

  static get fields() {
    return fields;
  }

  /**
   * Check for docker presence.
   * @param {Object} options
   * @param {Object} variant
   * @param {string} variant.arch
   * @returns {Promise<boolean>} true when docker executable is present
   */
  static async prepare(options, variant) {
    try {
      await execa(this.constructor.name, ["--version"]);
      return true;
    } catch {}

    return false;
  }

  async execute(
    sources,
    transformer,
    dependencies,
    options,
    expander = v => v
  ) {
    const { properties, staging } = await this.prepareExecute(options);

    async function* headLines() {
      let scratch = true;
      for (const [k, v] of Object.entries({
        ...properties.from,
        ...Object.fromEntries(
          Object.entries(dependencies)
            .filter(filterOutUnwantedDependencies())
            .filter(([k, v]) => dependenciesToFrom[k])
            .map(([k, v]) => [dependenciesToFrom[k], v.replace(/[>=]*/, "")])
        )
      })) {
        scratch = false;
        yield `FROM ${k}:${v}\n`;
      }

      if (scratch) {
        yield "FROM scratch\n";
      }
    }

    async function* trailingLines() {
      yield `WORKDIR ${properties.workdir}\n`;
      yield "COPY . .\n";
      if (properties.entrypoints) {
        yield `ENTRYPOINT ["node", "${
          Object.values(properties.entrypoints)[0]
        }"]\n`;
      }
    }

    const fp = fieldProvider(properties, fields);

    transformer.push({
      name: DOCKERFILE,
      match: entry => entry.name === DOCKERFILE,
      transform: async entry =>
        new ReadableStreamContentEntry(
          entry.name,
          keyValueTransformer(await entry.readStream, fp, {
            ...labelKeyValuePairs,
            headLines,
            trailingLines
          })
        ),
      createEntryWhenMissing: () => new EmptyContentEntry(DOCKERFILE)
    });

    for await (const file of copyEntries(
      transform(aggregateFifo(sources), transformer),
      staging,
      expander
    )) {
      if (options.verbose) {
        console.log(file.destination);
      }
    }

    if (options.verbose) {
      console.log(await readFile(join(staging, DOCKERFILE), utf8StreamOptions));
    }

    let tag = `${properties.name}:${properties.version}`;
    let image = "";

    if (!options.dry) {
      const docker = await execa(
        this.constructor.name,
        [
          "build",
          "--tag",
          tag,
          /*"--output","type=tar,dest=out.tar",*/ staging
        ],
        {
          cwd: staging
        }
      );

      const lines = docker.stderr.split(/\n/);
      const wl = lines.filter(l => l.match(/writing\s+image/));
      if (wl?.[0]) {
        image = wl[0].split(/\s+/)[3];
      }

      if (options.verbose) {
        console.log(docker.stderr);
        console.log(docker.stdout);
      }
    }

    return image;
  }

  async publish(artifact, destination, properties,logger) {

    const publish = analysePublish(destination, properties);
  
    logger(`Publishing to ${publish.url}`);
  
    const name = `${properties.name}:${properties.version}`;
    console.log(`docker tag ${artifact} ${publish.url}/${name}`);
    console.log(`docker push ${name}`);
  }
}

/**
 * @see {@link https://docs.docker.com/engine/reference/builder/}
 */
const fields = {
  name: { type: "string", mandatory: true, set: value => value.toLowerCase() },
  version: { type: "string", mandatory: true },
  description: { type: "string" },
  author: { alias: "maintainer", type: "string" },
  workdir: { type: "string", default: "/", mandatory: true }
};
