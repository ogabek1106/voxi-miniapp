FROM nginx:alpine

# Make nginx listen on Railway's $PORT
ENV PORT=8080

# Replace default config to listen on $PORT
RUN sed -i "s/listen       80;/listen       8080;/g" /etc/nginx/conf.d/default.conf

COPY . /usr/share/nginx/html

EXPOSE 8080
