'use client'
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import Image from "next/image";
import NowPlaying from "@/components/NowPlaying";
import Spinner from "@/components/Interface/Spinner";
import {useState} from "react";
import { motion, animate } from "framer-motion";

const Hero = () => {
	const { data, error, isLoading } = useSWR(`${process.env.NEXT_PUBLIC_HOST}/api/spotify-profile`, fetcher);
	
	const [isPlaying, setIsPlaying] = useState(false)
	
	if(isLoading){
		return (
			<div className="h-screen w-full flex items-center">
				<div className="text-sm text-gray-100/50 p-3"><Spinner /></div>
			</div>
		)
	}
	
	const getIsPlaying = (playing: boolean) => {
		setIsPlaying(playing);
	};
	
	return (
		<div className="relative z-20">
			<div className="flex">
				{data && (
					<div>
						{/* Mobile/Tablet: Vertical text on left */}
						<h1 className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 font-extrabold font-mono italic text-[var(--color-primary)] text-4xl md:text-6xl mix-blend-multiply z-20 [writing-mode:vertical-lr] rotate-360 origin-center">
							__<a target="_blank" style={{mixBlendMode:'overlay'}} className="mix-blend-overlay hover:mix-blend-exclusion hover:bg-white hover:text-[var(--color-accent)] hover:duration-300" href={data.external_urls?.spotify}>{data.display_name}</a>_UNWRAPPED__
						</h1>

						{/* Desktop: Horizontal text at bottom */}
						<h1 className="hidden lg:block fixed bottom-0 left-0 font-extrabold font-mono italic text-[var(--color-primary)] text-8xl mix-blend-multiply z-20">
							__<a target="_blank" style={{mixBlendMode:'overlay'}} className="mix-blend-hue hover:mix-blend-exclusion hover:text-[var(--color-accent)] hover:duration-300" href={data.external_urls?.spotify}>{data.display_name}</a>_UNWRAPPED__
						</h1>
						{/*<Image className="rounded-t-3xl rounded-bl-3xl drop-shadow-sm" src={data.images[0].url} alt={data.display_name} width={data.images[0].width} height={data.images[0].height} />*/}

						<NowPlaying getIsPlaying={getIsPlaying} />
					</div>
				)}
			</div>
		</div>
	)
}

export default Hero;