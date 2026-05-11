/**
 * OSDAI — PM2 Ecosystem Configuration
 * Used by: pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      name: 'osdai',
      script: 'server.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx/esm',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,

      env: {
        NODE_ENV: 'development',
        APP_ENV: 'development',
      },

      env_production: {
        NODE_ENV: 'production',
        APP_ENV: 'production',
      },

      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
