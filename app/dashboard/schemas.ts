import { z } from 'zod'

const trimmedString = z
  .string()
  .min(1)
  .transform(value => value.trim())
  .refine(value => value.length > 0, {
    message: 'Value cannot be empty',
  })

const optionalText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform(value => (typeof value === 'string' ? value.trim() : ''))

const optionalNullableText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform(value => {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }
    return null
  })

export const wordInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Slug must be lowercase alphanumeric with dashes',
    }),
  enWord: trimmedString,
  enIpa: optionalNullableText,
  enDefinition: trimmedString,
  enExample: optionalText,
  deWord: optionalText,
  deIpa: optionalNullableText,
  deDefinition: optionalText,
  deExample: optionalText,
})

export const wordUpdateSchema = wordInputSchema.omit({ slug: true }).partial()

const translationEntrySchema = z.object({
  word: trimmedString,
  ipa: optionalNullableText,
  def: trimmedString,
  ex: optionalText,
})

const importEntrySchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Slug must be lowercase alphanumeric with dashes',
    }),
  en: translationEntrySchema,
  de: translationEntrySchema,
})

export const wordImportSchema = z.array(importEntrySchema)

export type WordInput = z.infer<typeof wordInputSchema>
export type WordUpdateInput = z.infer<typeof wordUpdateSchema>
export type WordImportInput = z.infer<typeof wordImportSchema>

export const userUpdateSchema = z
  .object({
    isBanned: z.boolean().optional(),
    hasDashboardAccess: z.boolean().optional(),
    role: z.enum(['user', 'admin']).optional(),
    banReason: z.string().optional().nullable(),
  })
  .refine(
    body =>
      body.isBanned !== undefined ||
      body.hasDashboardAccess !== undefined ||
      body.role !== undefined,
    { message: 'No fields provided' },
  )

export type UserUpdateInput = z.infer<typeof userUpdateSchema>
