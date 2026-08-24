/**
 * PM2 Application Configuration for Production Deployment
 * Path: /var/www/app-chi-tieu/ecosystem.config.cjs
 *
 * Usage on VPS:
 *   pm2 start ecosystem.config.cjs
 *   pm2 reload ecosystem.config.cjs --update-env
 *   pm2 restart ecosystem.config.cjs --update-env
 *   pm2 stop ecosystem.config.cjs
 *   pm2 logs app-chi-tieu
 */
module.exports = {
  apps: [
    {
      name: 'app-chi-tieu',
      script: 'dist/server.cjs',
      cwd: '/var/www/app-chi-tieu',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 4000,
      min_uptime: '5s',
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        COMMIT_SHA: process.env.COMMIT_SHA || 'unknown',
        GIT_COMMIT: process.env.GIT_COMMIT || 'unknown',
      },
    },
  ],
};
