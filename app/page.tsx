import Hero from "@/components/Hero";
import Navigation from "@/components/Interface/Navigation";

export default function Home() {
  return (
    <main className="w-screen min-h-screen">
      <Navigation />
      <Hero />
    </main>
  );
}
