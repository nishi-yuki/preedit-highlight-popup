.PHONY: build install lint

build: bunsetu-popup@nishi-yuki.github.com.shell-extension.zip

clean:
	rm -f bunsetu-popup@nishi-yuki.github.com.shell-extension.zip

install: bunsetu-popup@nishi-yuki.github.com.shell-extension.zip
	gnome-extensions install bunsetu-popup@nishi-yuki.github.com.shell-extension.zip --force

lint:
	npx eslint src/extension.js

bunsetu-popup@nishi-yuki.github.com.shell-extension.zip: src/extension.js src/metadata.json src/stylesheet.css
	gnome-extensions pack src/ --force
