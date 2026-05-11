# EduNexus DevOps & Infrastructure Guide

This document outlines the production deployment strategy for the EduNexus Alpha platform.

## 1. Architecture Overview
- **Reverse Proxy**: Nginx (handling SSL termination, Gzip, and security headers).
- **Process Manager**: Docker (with PM2/Cluster mode inside for multi-core utilization).
- **State Layer**: 
  - PostgreSQL 15 (Relational Data)
  - Redis 7 (Caching, Session, Real-time)
- **Monitoring**: Integrated health checks and logs volume.

## 2. Deployment Steps

### Prerequisites
- Docker & Docker Compose installed.
- SSL Certificates (placed in `./nginx/ssl/live/`).

### Launching the Stack
```bash
# Build and start services in detached mode
docker-compose up -d --build
```

## 3. High Availability & Failover

### Zero-Downtime Deployment
The stack uses Docker Compose's default update strategy. To achieve zero-downtime:
1. Use a blue-green deployment strategy or a rolling update with multiple app instances.
2. The current Nginx config supports an upstream cluster.

### Error Recovery
- **App Crash**: Docker engine is configured with `restart: always`.
- **Database Failure**: PostgreSQL uses persistent volumes. Automatic backups run nightly via `crontab`.

## 4. Monitoring System
- **Health Endpoint**: `/api/health` returns status of App and DB connection.
- **Log Management**: All container logs are unified. Use `docker-compose logs -f app` to monitor.
- **Resources**: Use `docker stats` to monitor CPU/Memory consumption.

## 5. SSL & Security

### SSL Setup (Certbot)
To generate certificates:
```bash
docker run -it --rm --name certbot \
  -v "$(pwd)/nginx/ssl:/etc/letsencrypt" \
  certbot/certbot certonly --manual -d yourdomain.com
```

### Database Backups
Schedule the backup script:
```bash
# Add to crontab -e
0 2 * * * /bin/bash /opt/edunexus/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

## 6. Multi-Server Scaling
To scale horizontally:
1. Move Database and Redis to managed services (e.g., AWS RDS, ElastiCache).
2. Deploy the `app` container to multiple nodes.
3. Use a Global Load Balancer (Cloudflare, AWS ALB) to route traffic to Nginx on different nodes.
