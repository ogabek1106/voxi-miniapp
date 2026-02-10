# frontend/Dockerfile
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/* \
    && rm -f /etc/nginx/conf.d/default.conf

# IMPORTANT: copy from frontend folder
COPY frontend/index.html /usr/share/nginx/html/index.html

RUN printf "server {\n  listen 8080;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files \$uri \$uri/ =404; }\n}\n" > /etc/nginx/conf.d/site.conf

EXPOSE 8080
