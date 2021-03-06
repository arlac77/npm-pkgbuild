import globby from "globby";

export async function rpmspec(context, stagingDir, out, options = {}) {
  const pkg = { contributors: [], pacman: {}, ...context.pkg };

  const installdir = context.properties.installdir;
  let directory = "";

  if (pkg.repository) {
    directory = pkg.repository.directory ? "/" + pkg.repository.directory : "";
  }

  const properties = {
    Name: context.properties.name,
    Summary: pkg.description,
    License: pkg.license,
    Version: context.properties.pkgver.replace(/\-.*$/, ""),
    Release: context.properties.pkgrel,
    Packager: pkg.contributors
      .map(
        (c, i) => `${c.name} <${c.email}>`
      )[0],
    URL: pkg.homepage,
  };


  const npmDistPackage = options.npmDist
  ? `( cd %{_sourcedir}${installdir}
  tar -x --transform="s/^package\\///" -f %{buildroot}${directory}/${
    context.properties.name
  }-${context.properties.pkgver}.tgz)`
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

%prep

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
