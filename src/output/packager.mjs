import { join } from "path";
import { tmpdir } from "os";
import { mkdtemp, mkdir } from "fs/promises";

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

  static get workspaceLayout() {
    return {
      named: {
        staging: ""
      },
      others: []
    };
  }

  constructor(properties) {
    this._properties = { ...properties };
  }

  get fields() {
    return this.constructor.fields;
  }

  get properties() {
    const properties = this._properties;

    Object.entries(this.fields).forEach(([k, v]) => {
      const e = properties[v.alias];
      if (e !== undefined) {
        properties[k] = e;
      } else {
        const vak = v.alias || k;
        if (properties[vak] === undefined && v.default !== undefined) {
          properties[vak] = v.default;
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
      const m = options.publish.match(/^([\w_\+]+):\/\/(.*)/);

      if (m) {
        out.destination = m[1] === "file" ? m[2] : tmpdir;
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
   * Execute package generation
   */
  async execute(sources, transformer, dependencies, options, expander) {}
}
