# Solobase Demo Environment Deployment Guide

This guide covers the deployment and management of the Solobase demo environment, which provides containerized demo instances for users to test Solobase functionality.

## Architecture Overview

The demo environment consists of:

1. **Demo Containers**: Isolated Solobase instances with demo data
2. **Demo Manager**: API service for managing container lifecycle
3. **Reverse Proxy**: Routes traffic to demo instances (optional)
4. **Monitoring**: Health checks and metrics collection
5. **Cleanup Services**: Automatic resource management

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 2GB RAM and 10GB disk space
- Ports 8100-8199 available for demo instances
- Port 3000 available for demo manager API

### Basic Deployment

1. **Build the demo image:**
   ```bash
   cd solobase-demo-site
   docker build -f Dockerfile.demo -t solobase:demo .
   ```

2. **Start a single demo instance:**
   ```bash
   ./scripts/start-demo.sh start
   ```

3. **Start the demo manager service:**
   ```bash
   docker-compose -f docker-compose.demo.yml up demo-manager
   ```

### Full Production Deployment

1. **Start all services:**
   ```bash
   docker-compose -f docker-compose.demo.yml --profile manager --profile proxy up -d
   ```

2. **Verify deployment:**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/api/status
   ```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEMO_MAX_SESSIONS` | 10 | Maximum concurrent demo sessions |
| `DEMO_SESSION_TIMEOUT` | 1800 | Session timeout in seconds (30 min) |
| `DEMO_PORT_RANGE_START` | 8100 | Start of port range for demos |
| `DEMO_PORT_RANGE_END` | 8199 | End of port range for demos |
| `DEMO_CLEANUP_INTERVAL` | 300 | Cleanup check interval in seconds |
| `DEMO_AUTO_CLEANUP` | true | Enable automatic cleanup |

### Resource Limits

Each demo container is limited to:
- **Memory**: 256MB (with 128MB reservation)
- **CPU**: 0.5 cores (with 0.25 core reservation)
- **Storage**: 50MB database + 100MB file storage
- **Network**: Isolated demo network

### Security Constraints

- Containers run as non-root user (UID 1001)
- Read-only root filesystem with specific writable volumes
- No new privileges allowed
- Temporary filesystems for /tmp and /var/tmp
- Network isolation between demo instances

## API Usage

### Demo Manager API

The demo manager provides a REST API for managing demo sessions:

#### Start Demo Session
```bash
curl -X POST http://localhost:3000/api/demo/start \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "session": {
    "id": "demo-1234567890-abcd1234",
    "status": "starting",
    "accessUrl": "http://localhost:8101",
    "expiresAt": "2024-03-15T15:30:00.000Z",
    "credentials": {
      "email": "demo@solobase.dev",
      "password": "demo123!"
    }
  }
}
```

#### Check Session Status
```bash
curl http://localhost:3000/api/demo/{sessionId}/status
```

#### Stop Session
```bash
curl -X DELETE http://localhost:3000/api/demo/{sessionId}
```

#### System Status
```bash
curl http://localhost:3000/api/status
```

## Management Scripts

### Container Management

- **Start demo**: `./scripts/start-demo.sh start`
- **List demos**: `./scripts/start-demo.sh list`
- **Cleanup session**: `./scripts/start-demo.sh cleanup <session_id>`
- **Cleanup all**: `./scripts/start-demo.sh cleanup-all`

### Monitoring

- **Health check**: `./scripts/health-check.sh once`
- **Start monitoring**: `./scripts/monitor-demos.sh daemon`
- **Generate report**: `./scripts/monitor-demos.sh report`

### Cleanup

- **Cleanup expired**: `./scripts/cleanup-demos.sh once`
- **Force cleanup**: `./scripts/cleanup-demos.sh force`
- **Start cleanup daemon**: `./scripts/cleanup-demos.sh daemon`

## Monitoring and Logging

### Log Files

Logs are stored in the `logs/` directory:
- `monitor.log`: General monitoring logs
- `metrics-YYYYMMDD.json`: Daily metrics data
- `system-YYYYMMDD.json`: System metrics
- `container-{session_id}-YYYYMMDD.log`: Container logs
- `report-YYYYMMDD-HHMMSS.txt`: Monitoring reports

### Metrics Collection

The monitoring system collects:
- Container CPU and memory usage
- Network and disk I/O
- Application-specific metrics (if available)
- System resource utilization
- Docker daemon statistics

### Health Checks

Automated health checks monitor:
- Container responsiveness
- Application health endpoints
- System resource usage
- Docker daemon status

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check port usage
   netstat -tuln | grep 810
   # Adjust port range in environment variables
   ```

2. **Resource exhaustion**:
   ```bash
   # Check system resources
   ./scripts/health-check.sh system
   # Force cleanup if needed
   ./scripts/cleanup-demos.sh force
   ```

3. **Container startup failures**:
   ```bash
   # Check container logs
   docker logs <container_id>
   # Verify image build
   docker build -f Dockerfile.demo -t solobase:demo .
   ```

4. **Demo manager not responding**:
   ```bash
   # Check demo manager logs
   docker logs solobase-demo-manager
   # Restart service
   docker-compose restart demo-manager
   ```

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
./scripts/start-demo.sh start
```

### Manual Container Inspection

```bash
# List all demo containers
docker ps --filter "label=solobase.demo=true"

# Inspect container configuration
docker inspect <container_id>

# Execute commands in container
docker exec -it <container_id> /bin/sh

# View container logs
docker logs -f <container_id>
```

## Security Considerations

### Container Security

- Containers run with minimal privileges
- No access to host Docker socket from demo containers
- Resource limits prevent resource exhaustion attacks
- Automatic cleanup prevents long-running malicious processes

### Network Security

- Demo containers are isolated in separate network
- No direct access between demo instances
- Rate limiting on demo creation API
- Session-based access control

### Data Security

- No persistent data storage in demo containers
- Automatic data cleanup on session expiration
- Demo data is reset on container restart
- No access to production data or systems

## Performance Optimization

### Resource Management

- Use tmpfs for temporary storage to improve I/O performance
- Implement container resource limits to prevent resource hogging
- Monitor and adjust based on actual usage patterns

### Scaling

- Horizontal scaling by running multiple demo manager instances
- Load balancing across multiple host machines
- Container orchestration with Kubernetes for large deployments

### Caching

- Pre-built demo images for faster startup
- Shared base layers to reduce storage usage
- Image layer caching in CI/CD pipeline

## Backup and Recovery

### Configuration Backup

```bash
# Backup configuration files
tar -czf demo-config-backup.tar.gz \
  docker-compose.demo.yml \
  Dockerfile.demo \
  demo.env \
  scripts/
```

### Disaster Recovery

1. **Service restoration**:
   ```bash
   # Stop all services
   docker-compose down
   
   # Rebuild images
   docker build -f Dockerfile.demo -t solobase:demo .
   
   # Restart services
   docker-compose up -d
   ```

2. **Data recovery**: Demo data is ephemeral and doesn't require backup

## Maintenance

### Regular Tasks

- **Daily**: Review monitoring reports and system health
- **Weekly**: Update base images and security patches
- **Monthly**: Review resource usage and scaling needs
- **Quarterly**: Security audit and penetration testing

### Updates

1. **Update Solobase version**:
   ```bash
   # Update source code
   git pull origin main
   
   # Rebuild demo image
   docker build -f Dockerfile.demo -t solobase:demo .
   
   # Rolling update (stop old, start new)
   ./scripts/cleanup-demos.sh force
   docker-compose restart demo-manager
   ```

2. **Update demo manager**:
   ```bash
   # Update dependencies
   npm update
   
   # Restart service
   docker-compose restart demo-manager
   ```

## Support and Documentation

- **Issues**: Report issues in the main Solobase repository
- **Documentation**: See main Solobase documentation for application features
- **Community**: Join the Solobase community for support and discussions

## License

This demo environment is part of the Solobase project and follows the same license terms.