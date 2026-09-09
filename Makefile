build:
	npm ci
	deno install
	deno --allow-read --allow-env --allow-write class-converter.ts
	./converter.sh