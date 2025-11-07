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
		<div className="relative z-50">
			<div className="flex">
				{data && (
					<div>
						<h1 className="fixed bottom-0 left-0 font-extrabold font-mono italic text-cyan-500 text-8xl mix-blend-multiply z-50">__<a target="_blank" style={{mixBlendMode:'overlay'}} className="mix-blend-overlay hover:mix-blend-exclusion hover:bg-white hover:text-yellow-600 hover:duration-300" href={data.external_urls?.spotify}>{data.display_name}</a>_UNWRAPPED__</h1>
						{/*<Image className="rounded-t-3xl rounded-bl-3xl drop-shadow-sm" src={data.images[0].url} alt={data.display_name} width={data.images[0].width} height={data.images[0].height} />*/}
						
						<NowPlaying getIsPlaying={getIsPlaying} />
					</div>
				)}
			</div>
		</div>
	)
}

export default Hero;