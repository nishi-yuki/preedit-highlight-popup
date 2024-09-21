.PHONY: build install lint

build: preedit-highlight-popup@nishi-yuki.github.com.shell-extension.zip

clean:
	rm -f preedit-highlight-popup@nishi-yuki.github.com.shell-extension.zip

install: preedit-highlight-popup@nishi-yuki.github.com.shell-extension.zip
	gnome-extensions install preedit-highlight-popup@nishi-yuki.github.com.shell-extension.zip --force

lint:
	npx eslint src/*.js

preedit-highlight-popup@nishi-yuki.github.com.shell-extension.zip: src/extension.js src/prefs.js src/metadata.json src/stylesheet.css src/schemas/gschemas.compiled
	gnome-extensions pack src/ --force

src/schemas/gschemas.compiled: src/schemas/org.gnome.shell.extensions.preedit-highlight-popup.gschema.xml
	glib-compile-schemas src/schemas/
