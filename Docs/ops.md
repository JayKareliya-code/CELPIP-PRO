# Operations Runbook

## Flower (Celery monitoring UI)

Flower runs on port `5555` via docker-compose. It exposes worker state, queue
depth, and task history — including task arguments, which can contain user IDs
and S3 keys. Treat it as a privileged surface.

### Authentication

Basic auth is enforced by the `--basic_auth` flag in `docker-compose.yml`.
Credentials come from the `FLOWER_PASSWORD` env var (user is hard-coded as
`admin`). Set a strong password in `.env`:

```
FLOWER_PASSWORD=<at least 24 random chars>
```

Rotate the password whenever an operator with access leaves the team.

### Network exposure

**Flower MUST NOT be publicly routable in production.** Bind it to an internal
VPC endpoint or behind a VPN/SSH tunnel. The basic auth check is a fallback —
not the primary defense.

Recommended deployments:

- **AWS:** put Flower behind an internal ALB; security group allows ingress
  only from the VPN security group or bastion host.
- **Fly.io:** use a private 6PN address; do not publish port 5555.
- **Self-hosted:** bind only to `127.0.0.1` and access via `ssh -L 5555:localhost:5555`.

To reach Flower without exposing the port at all, use SSH port forwarding:

```
ssh -L 5555:flower.internal:5555 ops@bastion.example.com
# Then open http://localhost:5555 in a browser
```

### Verifying queues without Flower

If Flower is unreachable, check Redis directly:

```
redis-cli -u "$REDIS_URL" LLEN celery
redis-cli -u "$REDIS_URL" LLEN speaking
redis-cli -u "$REDIS_URL" LLEN writing
redis-cli -u "$REDIS_URL" LLEN mock_exam
redis-cli -u "$REDIS_URL" LLEN writing_mock
```
