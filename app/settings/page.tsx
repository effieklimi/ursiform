import { SettingsPage } from "@/components/settings-page";
import { SideNavigation } from "@/components/side-navigation";

export const metadata = {
  title: "Settings - Yearn",
  description: "Configure your Yearn application settings",
};

export default function Settings() {
  return (
    <main className="h-screen w-screen bg-background text-foreground overflow-hidden">
      <div className="flex h-full">
        <SideNavigation currentPage="settings" />
        <SettingsPage />
      </div>
    </main>
  );
}
