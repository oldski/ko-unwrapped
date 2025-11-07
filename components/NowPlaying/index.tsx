'use client';
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import useColorThief from "use-color-thief";
import { motion } from "framer-motion";
import { FaMusic, FaSpotify } from "react-icons/fa6";
import { clsx } from "clsx";

interface NowPlayingProps {
	getIsPlaying: (isPlaying: boolean) => void;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({ getIsPlaying }) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [imgSrc, setImgSrc] = useState<string>('');
	const [bpm, setBpm] = useState<number>(120);

	const { data, error } = useSWR(
		`${process.env.NEXT_PUBLIC_HOST}/api/now-playing`,
		fetcher,
		{ refreshInterval: 5000 }
	);

	const { color: clr, palette: colors } = useColorThief(imgSrc, {
		format: 'hex',
		quality: 10,
		colorCount: 6
	});

	// Ensure colors are strings for TypeScript
	const primaryColor = (clr as string) || '#1DB954';
	const backgroundColor = (colors?.[2] as string) || '#1DB954';
	const textColor = (colors?.[2] as string) || '#191414';

	const onExpand = () => setIsExpanded(!isExpanded);

	useEffect(() => {
		if (data && data?.isPlaying !== undefined) {
			setImgSrc(data.albumImageUrl);
			getIsPlaying(data?.isPlaying);

			if (data?.audioFeatures?.tempo) {
				setBpm(data.audioFeatures.tempo);
			}
		}
	}, [data, getIsPlaying]);

	if (error) {
		return <div>Error loading data</div>;
	}
	
	return (
		<div>
			{data?.isPlaying ? (
					<div className={
						clsx(
							isExpanded ? (
								'h-screen w-screen fixed top-0 bg-transparent p-5 duration-300 transition-all'
							) : (
								'absolute top-20 right-20 p-2 w-24 h-24 transition-all duration-300'
							), 'shadow-md'
						)}
					  onClick={onExpand}
					>
						
						<motion.div
							className="h-full w-full rounded rounded-r-3xl rounded-tl-3xl"
							style={isExpanded ? {
								backgroundColor: 'transparent',
								backgroundImage: `radial-gradient(transparent 1px, ${backgroundColor} 1px)`,
								backgroundSize: '4px 4px',
								backdropFilter: 'blur(3px)',
								opacity: 1,
							} : {
								color: primaryColor,
								backgroundColor: backgroundColor
							}}
							animate={!isExpanded ? {
								scale: [1, 1.1, 1],
							} : {}}
							transition={{
								duration: 60 / bpm,
								repeat: Infinity,
								ease: "easeInOut"
							}}
						>
							<motion.div
								className={clsx(!isExpanded ? 'w-full h-full opacity-100 transition-all duration-300 flex items-center justify-center' : 'hidden transition-all duration-300')}
								animate={!isExpanded ? {
									scale: [1, 1.1, 1],
								} : {}}
								transition={{
									duration: 60 / bpm,
									repeat: Infinity,
									ease: "easeInOut"
								}}
							>
								<FaMusic className="w-3/4 h-3/4"/>
							</motion.div>
							{isExpanded && (
								<div className="flex flex-col items-center justify-center w-full h-full p-10 gap-8">
									<h2 className="text-8xl font-extrabold italic inline drop-shadow-md" style={{'color': primaryColor}}>Now Playing</h2>

									<div className="flex items-center justify-center gap-10">
										{/* Pulsing Album Art */}
										<div className="relative">
											<motion.div
												className="absolute -inset-4 rounded-3xl"
												style={{ backgroundColor: primaryColor, opacity: 0.3 }}
												animate={{
													scale: [1, 1.1, 1],
												}}
												transition={{
													duration: 60 / bpm, // Pulse based on BPM
													repeat: Infinity,
													ease: "easeInOut"
												}}
											/>
											<Image
												src={data?.albumImageUrl || "/default-image.jpg"}
												alt={`${data?.title || "No Title"} [${data?.artist || "No Artist"}]`}
												width={300}
												height={300}
												className="relative rounded-2xl shadow-2xl"
											/>
										</div>

										<div className="flex flex-col gap-4">
											<div>
												<h4 className="text-3xl font-bold">{data?.artist || "Unknown Artist"}</h4>
												<h4 className="text-2xl font-light">
													{data?.title || "Unknown Title"}
												</h4>
											</div>

											{/* Audio Features */}
											{data?.audioFeatures && (
												<div className="grid grid-cols-2 gap-4 mt-4">
													<div className="bg-black/30 backdrop-blur-sm rounded-lg p-4">
														<p className="text-sm opacity-70">Tempo</p>
														<p className="text-3xl font-bold" style={{ color: primaryColor }}>
															{Math.round(data.audioFeatures.tempo)}
														</p>
														<p className="text-xs opacity-50">BPM</p>
													</div>
													<div className="bg-black/30 backdrop-blur-sm rounded-lg p-4">
														<p className="text-sm opacity-70">Energy</p>
														<p className="text-3xl font-bold" style={{ color: primaryColor }}>
															{Math.round(data.audioFeatures.energy * 100)}%
														</p>
													</div>
													<div className="bg-black/30 backdrop-blur-sm rounded-lg p-4">
														<p className="text-sm opacity-70">Danceability</p>
														<p className="text-3xl font-bold" style={{ color: primaryColor }}>
															{Math.round(data.audioFeatures.danceability * 100)}%
														</p>
													</div>
													<div className="bg-black/30 backdrop-blur-sm rounded-lg p-4">
														<p className="text-sm opacity-70">Valence</p>
														<p className="text-3xl font-bold" style={{ color: primaryColor }}>
															{Math.round(data.audioFeatures.valence * 100)}%
														</p>
													</div>
												</div>
											)}

											{/* Spotify Link */}
											<a
												href={data?.songUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all mt-4"
												style={{ backgroundColor: primaryColor, color: textColor }}
											>
												<FaSpotify size={24} />
												Open in Spotify
											</a>
										</div>
									</div>
								</div>
							)}
						</motion.div>
					</div>
			) : (
				<div>Shhh</div>
			)}
		</div>
	);
};

export default NowPlaying;