import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './context/AuthContext';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

export const metadata = {
  title: 'Formix — AI Form Builder',
  description: 'Describe a form in plain English. Get a polished, working form in seconds.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-canvas text-[#e7e9ec] antialiased min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
