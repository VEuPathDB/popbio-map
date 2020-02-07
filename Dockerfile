# should probably build it for real, and pull in libs however is proper, but
# until then, this uses a git submodule to check out libs repo

FROM nginx

COPY . /usr/share/nginx/html/

