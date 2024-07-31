.PHONY: build

build: bunsetu-popup@nishi-yuki.github.com.shell-extension.zip

bunsetu-popup@nishi-yuki.github.com.shell-extension.zip: src/extension.js src/metadata.json src/stylesheet.css
	gnome-extensions pack src/ --force
