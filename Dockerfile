FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8787
COPY --chown=node:node package.json serve.js server.mjs index.html classic.html manifest.webmanifest sw.js ./
COPY --chown=node:node js ./js
COPY --chown=node:node css ./css
COPY --chown=node:node assets ./assets
COPY --chown=node:node vendor ./vendor
USER node
EXPOSE 8787
CMD ["node", "serve.js"]
