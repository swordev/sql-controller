[![CI](https://github.com/swordev/sql-controller/actions/workflows/ci.yaml/badge.svg)](https://github.com/swordev/sql-controller/actions/workflows/ci.yaml)

# sql-controller (WIP)

> CLI tool for syncing configs of accounts, databases and privileges.

## Features

- Syncs on every config file change.

## Usage

```sh
npx @sql-controller/cli --help
```

### Docker

```sh
docker run -it --rm \
    -v $(pwd)/sql-controller.config.json:/var/lib/sql-controller/sql-controller.config.json:ro \
    ghcr.io/swordev/sql-controller --help
```
