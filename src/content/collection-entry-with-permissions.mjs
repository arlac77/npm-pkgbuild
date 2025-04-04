import { CollectionEntry } from "content-entry";

export class CollectionEntryWithPermissions extends CollectionEntry {
  constructor(name, properties) {
    super(name);
    Object.assign(this, properties);
  }

  #mode;

  set mode(value) {
    this.#mode = value;
  }

  get mode() {
    return this.#mode || super.mode;
  }
}
