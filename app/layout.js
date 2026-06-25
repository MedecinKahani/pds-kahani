'use client';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PDS Kahani</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
