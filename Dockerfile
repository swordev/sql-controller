FROM node:18-alpine
RUN apk add --no-cache \
	tzdata \
	mysql-client \
	postgresql-client

WORKDIR /var/lib/sql-controller/
COPY . /var/lib/sql-controller/

RUN set -x \
	&& npm install -g pnpm@8 \
	&& pnpm install \
	&& pnpm build \
	&& pnpm compose \
	&& BIN_PATH=/usr/local/bin/sql-controller \
	&& echo "#!/bin/sh" > $BIN_PATH \
	&& echo "node /var/lib/sql-controller/packages/cli/lib/bin.js \"\$@\"" >> $BIN_PATH \
	&& chmod +x $BIN_PATH \
	&& pnpm prune --production \
	&& npm uninstall -g pnpm \
	&& rm -rf /tmp/* \
	&& rm -rf /var/cache/apk/*

HEALTHCHECK CMD ["sql-controller", "check"]
CMD ["sql-controller", "start"]