#frontend/Dockerfile
FROM nginx:alpine

# Remove default nginx site config and html
RUN rm -rf /usr/share/nginx/html/* \
    && rm -f /etc/nginx/conf.d/default.conf

# Copy your index.html explicitly
COPY frontend/index.html /usr/share/nginx/html/index.html

# Create nginx config that listens on 8080
RUN printf "server {\n  listen 8080;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files \$uri \$uri/ =404; }\n}\n" > /etc/nginx/conf.d/site.conf

EXPOSE 8080
