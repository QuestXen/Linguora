import { Domine, Poppins, Playfair_Display, Merriweather } from 'next/font/google'

export const poppins = Poppins({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
})

export const domine = Domine({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-domine',
})

export const playfair = Playfair_Display({
  weight: ['600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
})

export const merriweather = Merriweather({
  weight: ['700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-merriweather',
})