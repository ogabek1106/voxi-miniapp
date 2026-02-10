#frontend/Dockerfile
FROM nginx:alpine

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy ONLY frontend files (from repo root)
COPY frontend/ /usr/share/nginx/html/

# Make nginx listen on Railway's port (8080)
RUN sed -i "s/listen       80;/listen       8080;/g" /etc/nginx/conf.d/default.conf

EXPOSE 8080
