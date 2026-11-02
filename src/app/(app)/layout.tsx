import { Sidebar } from "@/components/shell/sidebar";
import { AskBar } from "@/components/shell/ask-bar";

/** App shell: Lightfield sidebar on the left, page on the right, Ask bar floating over the page. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <main className="relative min-w-0 flex-1 bg-canvas">
        {children}
        <AskBar />
      </main>
    </div>
  );
}
