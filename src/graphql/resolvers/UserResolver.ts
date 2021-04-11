import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql'
import bcrypt from 'bcryptjs'
import { sign } from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { Not } from 'typeorm'

import { ACCESS_TOKEN_EXPIRE_TIME, JWT_ACCESS_SECRET } from '../../config'
import { User } from '../../entity/User'
import { RefreshToken } from '../../entity/RefreshToken'
import { SignUpInput } from '../types/SignUpInput'
import { SignInInput } from '../types/SignInInput'
import { AuthenticatedResponse } from '../types/AuthenticatedResponse'
import { sendRefreshToken } from '../../functions/sendRefreshToken'
import { UpdateMeInput } from '../types/UpdateMeInput'
import { UpdatePasswordInput } from '../types/UpdatePasswordInput'

const generateToken = () => randomBytes(128).toString('base64')

@Resolver()
export class UserResolver {
  @Query(() => String)
  async hello() {
    return 'Hello, World!'
  }

  @Mutation(() => User)
  async signUp(
    @Arg('data')
    { firstName, lastName, email, password, role, gender }: SignUpInput
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      gender
    }).save()
    return user
  }

  @Mutation(() => AuthenticatedResponse, { nullable: true })
  async signIn(
    @Arg('data') { email, password }: SignInInput,
    @Ctx() ctx: any
  ): Promise<AuthenticatedResponse | undefined> {
    const userAgent = ctx.req.headers['user-agent']
    if (!userAgent) return
    const user = await User.findOne({ email })
    if (!user || !user.isActive) return
    if (!(await bcrypt.compare(password, user.password))) return
    const iat = Math.floor(Date.now() / 1000)
    const exp = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRE_TIME
    const accessToken = sign(
      {
        id: user.id,
        role: user.role,
        iat,
        exp
      },
      JWT_ACCESS_SECRET
    )
    const refreshToken = generateToken()
    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      userAgent
    }).save()
    sendRefreshToken(ctx.res, refreshToken)
    return {
      userId: user.id,
      accessToken,
      issuedAt: iat,
      expiresAt: exp
    }
  }

  @Authorized()
  @Query(() => User, { nullable: true })
  async me(@Ctx() ctx: any): Promise<User | undefined> {
    return await User.findOne({ id: ctx.req.user.id })
  }

  @Query(() => AuthenticatedResponse, { nullable: true })
  async refreshToken(
    @Ctx() ctx: any
  ): Promise<AuthenticatedResponse | undefined> {
    const token = ctx.req.signedCookies.refreshToken
    if (!token) return
    const userAgent = ctx.req.headers['user-agent']
    if (!userAgent) return
    const foundRefreshToken = await RefreshToken.findOne({ token })
    if (!foundRefreshToken) return
    if (!foundRefreshToken.isActive) return
    const user = await User.findOne({ id: foundRefreshToken.userId })
    if (!user) return
    if (!user.isActive) return
    const iat = Math.floor(Date.now() / 1000)
    const exp = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRE_TIME
    const accessToken = sign(
      {
        id: user.id,
        role: user.role,
        iat,
        exp
      },
      JWT_ACCESS_SECRET
    )
    const refreshToken = generateToken()
    foundRefreshToken.token = refreshToken
    foundRefreshToken.userAgent = userAgent
    await foundRefreshToken.save()
    sendRefreshToken(ctx.res, refreshToken)
    return {
      userId: user.id,
      accessToken,
      issuedAt: iat,
      expiresAt: exp
    }
  }

  @Query(() => String)
  async signOut(@Ctx() ctx: any): Promise<string> {
    const token = ctx.req.signedCookies.refreshToken
    if (!token) return 'sign out successful'
    await RefreshToken.update({ token, isActive: true }, { isActive: false })
    sendRefreshToken(ctx.res, '')
    return 'sign out successful'
  }

  @Authorized()
  @Mutation(() => User, { nullable: true })
  async updateMe(
    @Arg('data')
    { firstName, lastName, gender, profileImage }: UpdateMeInput,
    @Ctx()
    ctx: any
  ): Promise<User | undefined> {
    const user = await User.findOne({ id: ctx.req.user.id })
    if (!user) return
    if (firstName) user.firstName = firstName
    if (lastName) user.lastName = lastName
    if (gender) user.gender = gender
    if (profileImage) user.profileImage = profileImage
    await user.save()
    return user
  }

  @Authorized()
  @Mutation(() => String, { nullable: true })
  async updatePassword(
    @Arg('data') { currentPassword, newPassword }: UpdatePasswordInput,
    @Ctx() ctx: any
  ): Promise<string | undefined> {
    const user = await User.findOne({ id: ctx.req.user.id })
    if (!user) return
    if (!(await bcrypt.compare(currentPassword, user.password))) return
    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()
    return 'password updated successfully'
  }

  @Authorized()
  @Query(() => [RefreshToken], { nullable: true })
  async activeSessions(@Ctx() ctx: any): Promise<RefreshToken[] | undefined> {
    const token = ctx.req.signedCookies.refreshToken
    if (!token) return
    const userId = ctx.req.user.id
    return await RefreshToken.find({
      where: {
        userId,
        isActive: true,
        token: Not(token)
      }
    })
  }

  @Authorized()
  @Mutation(() => String, { nullable: true })
  async removeSession(
    @Arg('sessionId') sessionId: string,
    @Ctx() ctx: any
  ): Promise<string | undefined> {
    const token = ctx.req.signedCookies.refreshToken
    if (!token) return
    const userId = ctx.req.user.id
    await RefreshToken.update(
      { id: sessionId, userId, isActive: true, token: Not(token) },
      { isActive: false }
    )
    return 'session removed'
  }
}
