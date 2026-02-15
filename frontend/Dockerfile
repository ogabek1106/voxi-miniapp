# frontend/Dockerfile
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/* \
    && rm -f /etc/nginx/conf.d/default.conf

COPY frontend/ /usr/share/nginx/html/

ENV PORT=8080

RUN cat > /etc/nginx/conf.d/site.conf <<'EOF'
server {
  listen ${PORT};
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location /js/ {
    try_files $uri =404;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
EOF

EXPOSE 8080
