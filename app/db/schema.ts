import {
  pgTable,
  serial,
  text,
  timestamp,
  date,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

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
