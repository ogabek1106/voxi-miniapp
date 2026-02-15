# frontend/Dockerfile
# frontend/Dockerfile
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/* \
    && rm -f /etc/nginx/conf.d/default.conf

COPY frontend/ /usr/share/nginx/html/

RUN printf "server {\n\
  listen 8080;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location /js/ {\n\
    try_files $uri =404;\n\
  }\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n" > /etc/nginx/conf.d/site.conf

EXPOSE 8080
