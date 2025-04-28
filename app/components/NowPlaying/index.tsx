'use client'
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import Spinner from "@/app/components/Interface/Spinner";
import NoiseOverlay from "@/app/components/Interface/NoiseOverlay";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import useColorThief from "use-color-thief";
import {
	useMotionTemplate,
	useMotionValue,
	motion,
	animate,
} from "framer-motion";
import OhSoQuiet from "@/app/components/OhSoQuiet";
import {FaMusic, FaSpotify} from "react-icons/fa6";
import {clsx} from "clsx";

const COLORS_TOP = ["#13FFAA", "#1E67C6", "#CE84CF", "#DD335C"];

interface NowPlayingProps {
	getIsPlaying: (isPlaying: boolean) => void;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({getIsPlaying}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const { data, error, isLoading} = useSWR(`${process.env.NEXT_PUBLIC_HOST}/api/now-playing`, fetcher);
	const [imgSrc, setImgSrc] = useState<string>('');
	const [bpm, setBpm] = useState<number>(120);
	const color = useMotionValue(COLORS_TOP[0]);
	
	const { color:clr, palette:colors } = useColorThief(imgSrc, {
		format: 'hex',
		quality: 10,
		colorCount: 6
	});
	
	const onExpand = () => setIsExpanded(!isExpanded);
	
	useEffect(()=>{
		if (data && data?.isPlaying !== undefined) {
			setImgSrc(data.albumImageUrl);
			getIsPlaying(data?.isPlaying);
		}
		
	}, [data, imgSrc])
	
	// useEffect(() => {
	// 	animate(color, colors, {
	// 		ease: "easeInOut",
	// 		duration: 8,
	// 		repeat: Infinity,
	// 		repeatType: "mirror",
	// 	});
	// }, [clr, color]);
	
	// useEffect(() => {
	// 	if (clr) {
	// 		color.set(clr); // Update MotionValue with the dominant color
	// 	}
	// }, [clr, color]);
	
	console.log(1, data)
	const backgroundImage = useMotionTemplate`radial-gradient(125% 125% at 25% 0%, ${colors[2]} 50%, ${color})`;
	// const border = useMotionTemplate`1px solid ${color}`;
	// const boxShadow = useMotionTemplate`0px 4px 24px ${color}`;
	
	if (error) {
		return <div>Error loading data</div>;
	}
	
	return (
		<div>
			{data?.isPlaying ? (
					<div className={clsx(isExpanded ? 'h-screen w-screen fixed top-0 bg-transparent p-5 duration-300 transition-all' : 'absolute top-10 right-20 p-2 w-24 h-24 rounded-r-3xl rounded-tl-3xl transition-all duration-300', 'shadow-md')} onClick={onExpand} style={isExpanded ? {color:clr,backgroundColor: 'transparent'} : {color:clr,backgroundColor: colors[2]}} >
						<div className="h-full w-full rounded-md" style={isExpanded? {
							backgroundColor: 'transparent',
							backgroundImage: `radial-gradient(transparent 1px, ${colors[2]} 1px)`,
							backgroundSize: '4px 4px',
							backdropFilter: 'blur(3px)',
							// mask: 'linear-gradient(rgb(0, 0, 0) 60%, rgba(0, 0, 0, 0) 100%)',
							opacity: 1,
						} : {
							color:clr,
							backgroundColor: colors[2]
						}}>
							<FaMusic className={clsx(!isExpanded ? 'w-full h-full opacity-100 transition-all duration-300 ' : 'hidden transition-all duration-300')}/>
							{isExpanded && (
								<div className="flex items-center justify-center w-full h-full p-10 gap-10">
									<h2 className="text-8xl font-extrabold italic inline drop-shadow-md" style={{'color': clr}}>Now Playing</h2>
									<Image
										src={data?.albumImageUrl || "/default-image.jpg"}
										alt={`${data?.title || "No Title"} [${data?.artist || "No Artist"}]`}
										width={300}
										height={300}
									/>
									<div className="flex flex-col">
										<h4 className="text-2xl inline">{data?.artist || "Unknown Artist"}</h4>
										<h4 className="text-2xl font-light lowercase inline">
											[{data?.title || "Unknown Title"}]
										</h4>
									</div>
								
								</div>
							)}
						</div>
					</div>
			) : (
				<div>Shhh</div>
			)}
		</div>
	)
	// return (
	// 	<>
	// 		{/*<div className="h-full fixed z-20 p-10" style={{*/}
	// 		{/*	background: `${clr}`,*/}
	// 		{/*	backgroundSize: "4px 4px",*/}
	// 		{/*	backdropFilter: "blur(3px)",*/}
	// 		{/*	opacity:.75,*/}
	// 		{/*	// WebkitMaskImage: "linear-gradient(rgb(0,0,0) 60%, rgba(0,0,0,0) 100%)",*/}
	// 		{/*	// maskImage: "linear-gradient(rgb(0,0,0) 60%, rgba(0,0,0,0) 100%)",*/}
	// 		{/*}}*/}
	// 		{/*/>*/}
	// 		<motion.section
	// 			style={{
	// 				backgroundImage,
	// 				opacity:.8,
	// 				backdropFilter: "blur(3px)",
	// 			}}
	// 			className="relative grid min-h-screen place-content-center overflow-hidden bg-green-800 px-4 py-24 text-gray-200 rounded-3xl m-20"
	// 		>
	// 			{/*<NoiseOverlay />*/}
	// 			<div className="relative z-10 flex flex-col items-center bg-yellow-600 p-20" style={{
	// 				// backgroundColor: "transparent",
	// 				// backgroundImage: `radial-gradient(transparent 1px, ${clr} 1px`,
	// 				// backgroundSize: "4px 4px",
	// 				// backdropFilter: "blur(3px)",
	// 				// opacity: 1,
	// 				// WebkitMaskImage: "linear-gradient(rgb(0,0,0) 60%, rgba(0,0,0,0) 100%)",
	// 				// maskImage: "linear-gradient(rgb(0,0,0) 60%, rgba(0,0,0,0) 100%)",
	// 			}}>
	// 				<h2 className="text-8xl font-extrabold italic inline drop-shadow-md" style={{'color': clr}}>Now Playing {clr}</h2>
	// 				<h4 className="text-2xl inline">{data?.artist || "Unknown Artist"}</h4>
	// 				<h4 className="text-2xl font-light lowercase inline">
	// 					[{data?.title || "Unknown Title"}]
	// 				</h4>
	// 				<Image
	// 					src={data?.albumImageUrl || "/default-image.jpg"}
	// 					alt={`${data?.title || "No Title"} [${data?.artist || "No Artist"}]`}
	// 					width={300}
	// 					height={300}
	// 				/>
	// 			</div>
	//
	// 		</motion.section>
	// 	</>
	// );
};

export default NowPlaying;