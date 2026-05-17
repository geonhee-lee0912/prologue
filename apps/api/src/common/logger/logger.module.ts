import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

/**
 * Pino 기반 로거.
 *
 * PII 마스킹 핵심: phone, email, OTP, JWT, password, hash, message content
 * 어떤 경로로도 평문이 로그에 남지 않도록 redact 한다.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL') ?? 'info',
          transport:
            (config.get<string>('NODE_ENV') ?? 'development') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: { singleLine: true, colorize: true, translateTime: 'SYS:HH:MM:ss' },
                }
              : undefined,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["x-api-key"]',
              'req.body.password',
              'req.body.phone',
              'req.body.phoneNumber',
              'req.body.email',
              'req.body.otp',
              'req.body.code',
              'req.body.content',
              'req.body.message',
              'res.headers["set-cookie"]',
              '*.password',
              '*.phone',
              '*.phoneNumber',
              '*.phoneHash',
              '*.email',
              '*.otp',
              '*.token',
              '*.accessToken',
              '*.refreshToken',
              '*.identityCiHash',
              '*.ciHash',
            ],
            censor: '[REDACTED]',
            remove: false,
          },
          customLogLevel: (_req, res, err) => {
            if (res.statusCode >= 500 || err) return 'error';
            if (res.statusCode >= 400) return 'warn';
            return 'info';
          },
        },
      }),
    }),
  ],
})
export class LoggerModule {}
