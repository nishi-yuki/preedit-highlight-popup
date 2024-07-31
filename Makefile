.PHONY: build install

build: bunsetu-popup@nishi-yuki.github.com.shell-extension.zip

install: bunsetu-popup@nishi-yuki.github.com.shell-extension.zip
	gnome-extensions install bunsetu-popup@nishi-yuki.github.com.shell-extension.zip --force

bunsetu-popup@nishi-yuki.github.com.shell-extension.zip: src/extension.js src/metadata.json src/stylesheet.css
	gnome-extensions pack src/ --force
