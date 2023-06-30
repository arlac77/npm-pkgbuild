import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, mkdir } from "node:fs/promises";
import { analysePublish } from "../publish.mjs";

/**
 * @typedef {Object} Field
 * @property {string} alias interchangeable field name
 * @property {string} type
 * @property {any} default
 * @property {boolean} mandatory
 */

/**
 * @param {Object} properties
 */
export class Packager {
  static get fields() {
    return {};
  }

  /**
   * @return {Object}
   */
  static get workspaceLayout() {
    return {
      named: {
        staging: ""
      },
      others: []
    };
  }

  /**
   * @param {Object} options
   * @param {Object} variant
   * @return {Promise<boolean>}
   */
  static async prepare(options,variant) {
    return false;
  }

  #properties;

  constructor(properties) {
    this.#properties = { ...properties };
  }

  get fileNameExtension()
  {
  	return this.constructor.fileNameExtension;
  }
  
  get fields() {
    return this.constructor.fields;
  }

  get properties() {
    const properties = this.#properties;

    Object.entries(this.fields).forEach(([k, v]) => {
      const e = properties[v.alias];
      if (e !== undefined) {
        properties[k] = v.set ? v.set(e) : e;
      } else {
        if(v.set && properties[k] !== undefined) {
          properties[k] = v.set(properties[k]);
        }

        const vak = v.alias || k;
        if (v.default !== undefined) {
          if (
            (Array.isArray(properties[vak]) && properties[vak].length === 0) ||
            properties[vak] === undefined
          ) {
            properties[vak] = v.default;
          }
        }
      }
    });

    return properties;
  }

  async prepareExecute(options) {
    const tmpdir = await this.tmpdir;

    const out = {
      properties: this.properties,
      destination: options.destination || tmpdir,
      tmpdir
    };

    const l = this.constructor.workspaceLayout;

    const mdo = { recursive: true };

    await Promise.all(l.others.map(d => mkdir(join(tmpdir, d), mdo)));

    for (const nd of Object.entries(l.named).map(([name, d]) => [
      name,
      join(tmpdir, d),
      mkdir(join(tmpdir, d), mdo)
    ])) {
      await nd[2];
      out[nd[0]] = nd[1];
    }

    if (options.publish) {
      for(const op of options.publish) {
        const publish = analysePublish(op, out.properties);

        out.destination = publish.scheme === "file:" ? publish.url : tmpdir;
  
        await mkdir(out.destination, { recursive: true });
      }
    }

    return out;
  }

  /**
   * Create tmp directory.
   * @return {Promise<string>} directory path
   */
  get tmpdir() {
    return mkdtemp(join(tmpdir(), this.constructor.name));
  }

  /**
   * Execute package generation.
   * @return {Promise<string>} location of the resulting package
   */
  async execute(sources, transformer, dependencies, options, expander) {}
}
