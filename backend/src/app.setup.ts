import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';

/**
 * Configures global security headers, CORS, validation, envelopes, and API prefix.
 * Shared between production bootstrap and E2E integration tests.
 */
export function configureApp(app: INestApplication): void {
  const httpInstance = app.getHttpAdapter().getInstance() as {
    disable?: (setting: string) => void;
  };
  if (typeof httpInstance?.disable === 'function') {
    httpInstance.disable('x-powered-by');
  }

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self)',
    );
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }
    next();
  });

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
}

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SkyRoute API')
    .setDescription(
      'Smart Travel Companion — Context-Aware & Weather-Adaptive API',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Health', 'Service readiness and diagnostics')
    .addTag('Auth', 'Multi-device JWT authentication and profile')
    .addTag('Discovery', 'Spatial radar and weather-aware food discovery')
    .addTag('Stays', 'Accommodation catalog and centroid-nearest lookup')
    .addTag('Trips', 'Trip management and 4-slot drag-and-drop timeline')
    .addTag('Weather', 'Open-Meteo hourly forecast sync and rain conflicts')
    .addTag('AI Copilot', 'Grounded tool calling, Plan B swap, and itinerary generator')
    .build();

  return SwaggerModule.createDocument(app, swaggerConfig);
}
