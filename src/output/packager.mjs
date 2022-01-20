import { join } from "path";
import { tmpdir } from "os";
import { mkdtemp } from "fs/promises";

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

  async prepareExecute() {
    const tmpdir = await this.tmpdir;
    return { properties: this.properties, tmpdir, staging: tmpdir };
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
