import Nav from "@/components/Nav";
import { ChatProvider } from "@/components/ChatContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="flex-1 overflow-auto">
        <ChatProvider>{children}</ChatProvider>
      </main>
    </div>
  );
}
