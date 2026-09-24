# Nyrathen mobile-only multiplayer server. No browser game is built or served.
FROM node:22-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json LICENSE ./
COPY --chown=node:node shared ./shared
COPY --chown=node:node server ./server
COPY --chown=node:node tools/database.mjs tools/moderate.mjs tools/config.mjs ./tools/
RUN mkdir -p /app/.data && chown node:node /app/.data
USER node
ENV HOST=0.0.0.0 PORT=3000 DATA_PATH=/app/.data/nyrathen.sqlite BACKUP_DIRECTORY=/app/.data/backups
VOLUME ["/app/.data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/server.mjs"]
