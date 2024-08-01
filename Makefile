.PHONY: build install lint

build: preedit-highlight-popup@nishi-yuki.github.com.shell-extension.zip

clean:
	rm -f preedit-highlight-popup@nishi-yuki.github.com.shell-extension.zip

install: preedit-highlight-popup@nishi-yuki.github.com.shell-extension.zip
	gnome-extensions install preedit-highlight-popup@nishi-yuki.github.com.shell-extension.zip --force

lint:
	npx eslint src/extension.js

preedit-highlight-popup@nishi-yuki.github.com.shell-extension.zip: src/extension.js src/metadata.json src/stylesheet.css
	gnome-extensions pack src/ --force
