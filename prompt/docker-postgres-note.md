kperr@fedora:/$ sudo docker run -d \
  --name postgres-db \
  --restart unless-stopped \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=change_this_password \
  -e POSTGRES_DB=appdb \
  -p 127.0.0.1:5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:17


Unable to find image 'postgres:17' locally
17: Pulling from library/postgres
fcdd3a481359: Pull complete 
99ce35cabaf9: Pull complete 
d43ee31e40df: Pull complete 
8aebe6431dc8: Pull complete 
52fc2be321a4: Pull complete 
affbe3357b39: Pull complete 
e30751283c57: Pull complete 
c5602f014e9e: Pull complete 
ecc510c1e359: Pull complete 
c9432d362cca: Pull complete 
dc30f2779c66: Pull complete 
57644501a07f: Pull complete 
3be737420556: Pull complete 
b86134c2eeb6: Pull complete 
3de48e9ae1ea: Download complete 
a7cb71218182: Download complete 
Digest: sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3
Status: Downloaded newer image for postgres:17
8e76cf6a2a39ebc82f396bf2fd7ccdcbe69886e871c89a15ce233cba17f54040


kperr@fedora:/$ sudo docker ps
CONTAINER ID   IMAGE         COMMAND                  CREATED              STATUS              PORTS                      NAMES
8e76cf6a2a39   postgres:17   "docker-entrypoint.s…"   About a minute ago   Up About a minute   127.0.0.1:5432->5432/tcp   postgres-db
kperr@fedora:/$ sudo docker exec postgres-db pg_isready -U appuser -d appdb
/var/run/postgresql:5432 - accepting connections
kperr@fedora:/$ sudo docker exec -it postgres-db psql -U appuser -d appdb
psql (17.11 (Debian 17.11-1.pgdg13+2))
Type "help" for help.

appdb=# SELECT version(); 

PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit
(1 row)

kperr@fedora:/$ sudo docker compose version
Docker Compose version v5.6.0
kperr@fedora:/$ sudo docker ps
CONTAINER ID   IMAGE         COMMAND                  CREATED         STATUS         PORTS                      NAMES
8e76cf6a2a39   postgres:17   "docker-entrypoint.s…"   4 minutes ago   Up 4 minutes   127.0.0.1:5432->5432/tcp   postgres-db
