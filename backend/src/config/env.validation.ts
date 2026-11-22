import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3001),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().integer().min(1).max(65535).default(5432),
  DB_USERNAME: Joi.string().default('skyroute'),
  DB_PASSWORD: Joi.string().allow('').default('skyroute_secret'),
  DB_NAME: Joi.string().default('skyroute_db'),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().integer().min(1).max(65535).default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  WEATHER_CACHE_TTL_SEC: Joi.number().integer().min(60).default(1800),

  JWT_ACCESS_SECRET: Joi.when('NODE_ENV', {
    is: 'test',
    then: Joi.string().min(16).default('test_access_secret_32chars_minimum'),
    otherwise: Joi.string().min(16).required(),
  }),
  JWT_ACCESS_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('15m'),
  JWT_REFRESH_SECRET: Joi.when('NODE_ENV', {
    is: 'test',
    then: Joi.string().min(16).default('test_refresh_secret_32chars_minimum'),
    otherwise: Joi.string().min(16).required(),
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('7d'),
  BCRYPT_ROUNDS: Joi.number().integer().min(4).max(15).default(12),

  OPEN_METEO_BASE_URL: Joi.string()
    .uri()
    .default('https://api.open-meteo.com/v1'),
  RAIN_CONFLICT_THRESHOLD_PCT: Joi.number().min(0).max(100).default(60),
  DETOUR_WARNING_KM: Joi.number().positive().default(8.0),
  PLAN_B_RADIUS_METERS: Joi.number()
    .integer()
    .min(500)
    .max(10000)
    .default(3000),

  LLM_PROVIDER: Joi.string().valid('gemini', 'openai').default('gemini'),
  GEMINI_API_KEY: Joi.string().allow('').optional(),
  AI_MODEL_NAME: Joi.string().default('gemini-3.8-flash'),
});
