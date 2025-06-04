import { redirect } from "next/navigation";

export const metadata = {
  title: "Ursiform",
  description:
    "Open source AI agent for vector database queries and operations",
  icons: { icon: "/favicon.ico" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function Home() {
  redirect("/chat");
}
