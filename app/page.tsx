import { redirect } from "next/navigation";

export const metadata = {
  title: "Ursiform",
  description:
    "Open source AI agent for vector database queries and operations",
  viewport: "width=device-width, initial-scale=1",
  icons: { icon: "/favicon.ico" },
};

export default function Home() {
  redirect("/chat");
}
