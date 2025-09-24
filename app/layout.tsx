import "./globals.css";
import { AuthProvider } from "../components/AuthContext";
import Navbar from "../components/ui/Navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">
        <AuthProvider>
          <div className="mx-auto max-w-3xl p-4">
            <Navbar />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
