# frontend/Dockerfile
FROM nginx:alpine

# Clean default config and files
RUN rm -rf /usr/share/nginx/html/* \
    && rm -f /etc/nginx/conf.d/default.conf

# Copy ALL frontend files (index.html + js)
COPY frontend/ /usr/share/nginx/html/

# Simple, boring nginx config
RUN printf "server {\n  listen 8080;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri /index.html =404;\n  }\n}\n" > /etc/nginx/conf.d/site.conf

EXPOSE 8080
