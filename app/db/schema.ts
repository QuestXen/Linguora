import {
  pgTable,
  serial,
  text,
  timestamp,
  date,
  uniqueIndex,
  boolean,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const authUsers = pgTable(
  'auth_users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    emailIdx: uniqueIndex('auth_users_email_idx').on(table.email),
  }),
)

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    providerAccountIdx: uniqueIndex('auth_accounts_provider_account_idx').on(
      table.providerId,
      table.accountId,
    ),
    userIdx: index('auth_accounts_user_idx').on(table.userId),
  }),
)

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
  },
  table => ({
    tokenIdx: uniqueIndex('auth_sessions_token_idx').on(table.token),
    userIdx: index('auth_sessions_user_idx').on(table.userId),
  }),
)

export const authVerifications = pgTable(
  'auth_verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    identifierIdx: index('auth_verifications_identifier_idx').on(table.identifier),
  }),
)

export const words = pgTable('words', {
  slug: text('slug').primaryKey(),
  enWord: text('en_word').notNull(),
  enIpa: text('en_ipa'),
  enDefinition: text('en_definition').notNull(),
  enExample: text('en_example').notNull(),
  deWord: text('de_word').notNull(),
  deIpa: text('de_ipa'),
  deDefinition: text('de_definition').notNull(),
  deExample: text('de_example').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const wordSchedules = pgTable(
  'word_schedules',
  {
    id: serial('id').primaryKey(),
    slug: text('slug')
      .notNull()
      .references(() => words.slug, { onDelete: 'cascade' }),
    scheduledFor: date('scheduled_for').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    scheduledForUnique: uniqueIndex('word_schedules_scheduled_for_key').on(
      table.scheduledFor,
    ),
    slugUnique: uniqueIndex('word_schedules_slug_key').on(table.slug),
  }),
)

export const wordScheduleRelations = relations(wordSchedules, ({ one }) => ({
  word: one(words, {
    fields: [wordSchedules.slug],
    references: [words.slug],
  }),
}))

export type Word = typeof words.$inferSelect
export type WordSchedule = typeof wordSchedules.$inferSelect
export type AuthUser = typeof authUsers.$inferSelect
export type AuthAccount = typeof authAccounts.$inferSelect
export type AuthSession = typeof authSessions.$inferSelect
export type AuthVerification = typeof authVerifications.$inferSelect
