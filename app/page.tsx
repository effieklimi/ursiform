import { redirect } from "next/navigation";

export const metadata = {
  title: "Yearn - Natural Language Query Interface",
  description: "Ask questions about your vector collections in plain English",
  viewport: "width=device-width, initial-scale=1",
  icons: { icon: "/favicon.ico" },
};

export default function Home() {
  redirect("/chat");
}
