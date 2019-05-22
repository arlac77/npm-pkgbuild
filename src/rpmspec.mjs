import { quote } from "./util.mjs";

export async function rpmspec(context, stagingDir, out, options = {}) {
    const pkg = { contributors: [], pacman: {}, ...context.pkg };

    const properties =
    {
        Name: pkg.name,
        Summary: pkg.description,
        License: pkg.license,
        Version: context.properties.pkgver.replace(/\-.*$/, ""),
        Release: context.properties.pkgrel
    };


    out.write(`${Object.keys(properties)
            .filter(k => properties[k] !== undefined)
            .map(k => `${k}=${quote(properties[k])}`)
            .join("\n")}
    
%description
This is my first RPM package, which does nothing.

%prep
# we have no source, so nothing here

%build
cat > hello-world.sh <<EOF
#!/usr/bin/bash
echo Hello world
EOF

%install
mkdir -p %{buildroot}/usr/bin/
install -m 755 hello-world.sh %{buildroot}/usr/bin/hello-world.sh

%files
/usr/bin/hello-world.sh

%changelog
# let's skip this for now
`);


    out.end();
}
