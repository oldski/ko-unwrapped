import Hero from "@/app/components/Hero";
import Link from "next/link";
import Navigation from "@/app/components/Interface/Navigation";
import TopTracks from "@/app/components/TopTracks";
import TopArtists from "@/app/components/TopArtists";
import TriangleBackground from "@/app/components/Interface/TriangleBackground";

export default function Home() {
  return (
    <main className="w-screen min-h-screen">
      <TriangleBackground>
        
        <Navigation />
        <Hero />
        {/*<TopTracks />*/}
        {/*<TopArtists />*/}
        
      </TriangleBackground>
    </main>
  );
}
