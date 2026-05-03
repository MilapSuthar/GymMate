# MinIO

Local S3-compatible object storage for development.

- Console: http://localhost:9001
- API: http://localhost:9000
- User: gymmate
- Password: gymmate123

Create the `gymmate-photos` bucket after first run via the console or:

```bash
mc alias set local http://localhost:9000 gymmate gymmate123
mc mb local/gymmate-photos
mc anonymous set public local/gymmate-photos
```
