import { ClienteBottomNav } from "@/components/ClienteBottomNav";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex-1 flex flex-col pb-20">{children}</div>
      <ClienteBottomNav />
    </>
  );
}
