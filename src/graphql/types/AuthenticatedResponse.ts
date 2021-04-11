import { Field, ID, ObjectType } from 'type-graphql'

@ObjectType()
export class AuthenticatedResponse {
  @Field(() => ID)
  userId: string

  @Field()
  accessToken: string

  @Field()
  issuedAt: number

  @Field()
  expiresAt: number
}
