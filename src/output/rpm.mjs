import { globby } from "globby";
import { Packager } from "./packager.mjs";

export class RPM extends Packager {
  static get name() {
    return "rpm";
  }

  static get fileNameExtension() {
    return ".rpm";
  }

  static get fields() {
    return fields;
  }

  async execute(options) {
    const properties = this.properties;
    const mandatoryFields = this.mandatoryFields;
    const tmp = await mkdtemp(join(tmpdir(), "rpm-"));
    const staging = join(tmp, `${properties.name}-${properties.version}`);

    let specFileName = `${properties.name}.spec`;


    const transformers = [];

    await copyEntries(
      transform(this.source, transformers),
      staging
    );

    await execa("rpmbuild", ["-ba", specFileName]);
  }
}

const fields = {
  Name: { alias: "name", type: "string" },
  Summary: { alias: "description", type: "string" },
  License: { alias: "license", type: "string" },
  Version: { alias: "version", type: "string" },
  Release: { type: "integer", default: 0 },
  Packager: { type: "string" },
  URL: { alias: "homepage", type: "string" }
};

const sections = {
  description: {},
  prep: {},
  build: {},
  install: {},
  files: {},
  changelog: {}
};

export async function rpmspec(context, stagingDir, out, options = {}) {
  const pkg = { contributors: [], pacman: {}, ...context.pkg };

  const installdir = context.properties.installdir;
  let directory = "";

  const npmDistPackage = options.npmDist
    ? `( cd %{_sourcedir}${installdir}
  tar -x --transform="s/^package\\///" -f %{buildroot}${directory}/${pkg.name}-${context.properties.pkgver}.tgz)`
    : "";

  const npmModulesPackage = options.npmModules
    ? `( cd %{_sourcedir}/${directory}
  tar cf - node_modules)|(cd %{buildroot}${installdir};tar xf - )`
    : "";

  out.write(`${Object.keys(properties)
    .filter(k => properties[k] !== undefined)
    .map(k => `${k}: ${properties[k]}`)
    .join("\n")}

%description
${pkg.description}

%build
npm install
mkdir -p %{buildroot}${installdir}
${npmDistPackage}
${npmModulesPackage}

%install

%files
${installdir}bin/*
${installdir}node_modules/*
`);

  for (const name of await globby("**/*", { cwd: stagingDir })) {
    out.write(name + "\n");
  }

  out.end();
}
