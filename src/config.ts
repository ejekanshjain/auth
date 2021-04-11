import { config } from 'dotenv'

if (process.env.NODE_ENV !== 'production') config()

const NODE_ENV: string = process.env.NODE_ENV || 'development'

const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 4000

const JWT_ACCESS_SECRET: string =
  process.env.JWT_ACCESS_SECRET || 'access_secret'

const ACCESS_TOKEN_EXPIRE_TIME: number = process.env.ACCESS_TOKEN_EXPIRE_TIME
  ? parseInt(process.env.ACCESS_TOKEN_EXPIRE_TIME)
  : 3600 // in seconds

const COOKIE_SECRET: string = process.env.COOKIE_SECRET || 'cookie_secret'

const SECURE_COOKIE: boolean = process.env.SECURE_COOKIE === 'true'

const CORS_ORIGINS: string[] = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['*']

export {
  NODE_ENV,
  PORT,
  JWT_ACCESS_SECRET,
  ACCESS_TOKEN_EXPIRE_TIME,
  COOKIE_SECRET,
  SECURE_COOKIE,
  CORS_ORIGINS
}
