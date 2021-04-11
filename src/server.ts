import 'reflect-metadata'
import { ApolloServer } from 'apollo-server-express'
import express from 'express'
import { buildSchema } from 'type-graphql'
import { createConnection } from 'typeorm'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import {
  COOKIE_SECRET,
  CORS_ORIGINS,
  JWT_ACCESS_SECRET,
  NODE_ENV,
  PORT
} from './config'
import { UserResolver } from './graphql/resolvers/UserResolver'
import { authChecker } from './auth/authChecker'
import { authTokenMiddleware } from './auth/authTokenMiddleware'

const main = async () => {
  console.log('Starting server up...')

  await createConnection()
  console.log('Connected to DB...')

  const schema = await buildSchema({
    resolvers: [UserResolver],
    authChecker
  })
  console.log('Graphql Schema build complete...')

  const apolloServer = new ApolloServer({
    schema,
    context: ({ req, res }) => ({ req, res })
  })

  const app = express()

  app.use(
    cors({
      origin: CORS_ORIGINS,
      credentials: true
    })
  )
  app.use(cookieParser(COOKIE_SECRET))
  app.use(authTokenMiddleware(JWT_ACCESS_SECRET))

  apolloServer.applyMiddleware({ app, cors: false })

  app.listen(PORT, () =>
    console.log(
      `${
        NODE_ENV.charAt(0).toUpperCase() + NODE_ENV.slice(1)
      } Server Started on Port ${PORT}...`
    )
  )
}

main()
