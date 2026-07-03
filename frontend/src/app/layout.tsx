import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CollabBite | Real-time Group Ordering',
  description: 'Order food together on Swiggy collaboratively.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
