import Hero from "@/app/components/Hero";
import Navigation from "@/app/components/Interface/Navigation";

export default function Home() {
  return (
    <main className="w-screen min-h-screen">
      <Navigation />
      <Hero />
    </main>
  );
}
