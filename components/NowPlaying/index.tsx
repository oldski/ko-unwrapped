'use client';
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import Image from "next/image";
import React, { useEffect, useState, useRef } from "react";
import { FaSpotify } from "react-icons/fa6";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import useMouseShadow from "@/hooks/useMouseShadow";

export const NowPlaying: React.FC = () => {
	const pathname = usePathname();
	const isHomePage = pathname === '/';
	const [bpm, setBpm] = useState<number>(120);

	// GSAP refs for animations
	const titleRef = useRef<HTMLHeadingElement>(null);
	const albumArtRef = useRef<HTMLDivElement>(null);
	const albumGlowRef = useRef<HTMLDivElement>(null);
	const albumImageRef = useRef<HTMLDivElement>(null);
	const textContainerRef = useRef<HTMLDivElement>(null);
	const trackTitleRef = useRef<HTMLHeadingElement>(null);
	const artistRef = useRef<HTMLHeadingElement>(null);
	const nowPlayingContainerRef = useRef<HTMLDivElement>(null);

	// Mouse position state for parallax
	const mousePos = useRef({ x: 0, y: 0 });

	const { data, error } = useSWR(
		`${process.env.NEXT_PUBLIC_HOST}/api/now-playing`,
		fetcher,
		{ refreshInterval: 5000 }
	);

	useEffect(() => {
		if (data && data?.isPlaying !== undefined) {
			if (data?.audioFeatures?.tempo) {
				setBpm(data.audioFeatures.tempo);
			}
		}
	}, [data]);

	// GSAP: Initial entrance animation
	useEffect(() => {
		if (!data?.isPlaying || !isHomePage) return;

		// Set initial states
		gsap.set([titleRef.current, albumArtRef.current, textContainerRef.current], {
			opacity: 0,
			y: 30
		});

		// Staggered entrance animation with delay
		const tl = gsap.timeline({ delay: 1.5 }); // Delay to let page transition finish
		tl.to(albumArtRef.current, {
			opacity: 1,
			y: 0,
			duration: 0.8,
			ease: "power3.out"
		})
		.to(titleRef.current, {
			opacity: 1,
			y: 0,
			duration: 0.6,
			ease: "power3.out"
		}, "-=0.4")
		.to(textContainerRef.current, {
			opacity: 1,
			y: 0,
			duration: 0.6,
			ease: "power3.out"
		}, "-=0.4");

		return () => {
			tl.kill();
		};
	}, [data?.isPlaying, isHomePage]);

	// GSAP: Looping animations (BPM-synced)
	useEffect(() => {
		if (!data?.isPlaying || !isHomePage) return;

		const animations: gsap.core.Tween[] = [];
		const beatDuration = 60 / bpm; // Duration of one beat in seconds

		// Title breathing animation (synced to BPM - 2 beats)
		if (titleRef.current) {
			animations.push(gsap.to(titleRef.current, {
				opacity: 0.7,
				duration: beatDuration * 2,
				ease: "power1.inOut",
				yoyo: true,
				repeat: -1
			}));
		}

		// Album glow pulse (synced to BPM - 1 beat)
		if (albumGlowRef.current) {
			animations.push(gsap.to(albumGlowRef.current, {
				scale: 1.1,
				duration: beatDuration,
				ease: "power1.inOut",
				yoyo: true,
				repeat: -1
			}));
		}

		// Album art subtle pulse (synced to BPM - 1 beat)
		if (albumArtRef.current) {
			animations.push(gsap.to(albumArtRef.current, {
				scale: 1.02,
				duration: beatDuration,
				ease: "power1.inOut",
				yoyo: true,
				repeat: -1
			}));
		}

		// Track title opacity animation (synced to BPM - 4 beats)
		if (trackTitleRef.current) {
			animations.push(gsap.to(trackTitleRef.current, {
				opacity: 0.8,
				duration: beatDuration * 4,
				ease: "power1.inOut",
				yoyo: true,
				repeat: -1,
				delay: beatDuration * 0.5
			}));
		}

		// Artist letter-spacing animation (synced to BPM - 3 beats)
		if (artistRef.current) {
			animations.push(gsap.to(artistRef.current, {
				letterSpacing: '0.02em',
				duration: beatDuration * 3,
				ease: "power1.inOut",
				yoyo: true,
				repeat: -1
			}));
		}

		// Text container subtle float (synced to BPM - 8 beats)
		if (textContainerRef.current) {
			animations.push(gsap.to(textContainerRef.current, {
				y: -10,
				duration: beatDuration * 8,
				ease: "sine.inOut",
				yoyo: true,
				repeat: -1
			}));
		}

		// Cleanup function
		return () => {
			animations.forEach(anim => anim.kill());
		};
	}, [data?.isPlaying, bpm, isHomePage]);

	// GSAP: Mouse parallax effect
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isHomePage) return;

			const x = (e.clientX / window.innerWidth) - 0.5;
			const y = (e.clientY / window.innerHeight) - 0.5;

			mousePos.current = { x, y };

			// Parallax for title
			if (titleRef.current) {
				gsap.to(titleRef.current, {
					y: y * 40,
					duration: 0.5,
					ease: "power2.out"
				});
			}

			// Parallax for album art (3D rotation) - DISABLED to allow shadow effect to work
			// if (albumArtRef.current) {
			// 	gsap.to(albumArtRef.current, {
			// 		rotateX: -y * 20,
			// 		rotateY: x * 20,
			// 		duration: 0.5,
			// 		ease: "power2.out"
			// 	});
			// }

			// Parallax for album glow
			if (albumGlowRef.current) {
				gsap.to(albumGlowRef.current, {
					rotateX: -y * 20,
					rotateY: x * 20,
					duration: 0.5,
					ease: "power2.out"
				});
			}

			// Parallax for album image - DISABLED to allow shadow effect to work
			// The useMouseShadow hook provides the interactive effect instead
			// if (albumImageRef.current) {
			// 	gsap.to(albumImageRef.current, {
			// 		rotateX: -y * 20,
			// 		rotateY: x * 20,
			// 		duration: 0.5,
			// 		ease: "power2.out"
			// 	});
			// }

			// Parallax for text container
			if (textContainerRef.current) {
				gsap.to(textContainerRef.current, {
					x: x * 30,
					y: y * 20,
					duration: 0.5,
					ease: "power2.out"
				});
			}
		};

		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	}, [isHomePage]);

	// GSAP: Scroll-linked scale down and fade to top left
	useEffect(() => {
		if (!data?.isPlaying || !isHomePage || !nowPlayingContainerRef.current) return;

		// Reset transform when coming to home page
		gsap.set(nowPlayingContainerRef.current, {
			scale: 1,
			x: 0,
			y: 0,
			opacity: 1,
			clearProps: 'transform,opacity' // Clear any previous transforms
		});

		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: nowPlayingContainerRef.current,
				start: 'top top',
				end: '+=600', // Scroll 600px to complete animation
				scrub: 1.5, // Smooth scroll-linked animation
			}
		});

		tl.to(nowPlayingContainerRef.current, {
			scale: 0.4,
			x: '-35vw', // Move to left
			y: '-35vh', // Move to top
			opacity: 0,
			ease: 'none'
		});
		
		return () => {
			tl.kill();
			ScrollTrigger.getAll().forEach(st => {
				if (st.trigger === nowPlayingContainerRef.current) {
					st.kill();
				}
			});
		};
	}, [data?.isPlaying, isHomePage]);
	
	
	// Apply mouse-driven shadow effect
	useMouseShadow(albumImageRef, { colorVar: '--color-bg-3', intensity: 20 });
	
	if (error) {
		return <div>Error loading data</div>;
	}

	// Render homepage version (full screen, parallax, BPM-synced)
	if (isHomePage && data?.isPlaying) {
		return (
			<div className="h-screen w-screen duration-300 transition-all pointer-events-none isolate will-change-transform z-50">
				<div
					ref={nowPlayingContainerRef}
					className="flex flex-col justify-center items-center w-full h-full p-4 sm:p-6 md:p-10 gap-4 opacity-100"
				>
					{/* Desktop: horizontal layout, Mobile/Tablet: vertical layout */}
					<div className="flex flex-col lg:flex-row items-center justify-start gap-6 md:gap-8 lg:gap-10 space-x-10 w-full max-w-6xl">
						{/* 3D Tilting Album Art */}
						<div
							className="relative flex-shrink-0 pointer-events-auto"
							style={{
								perspective: '1000px',
							}}
						>
							<div
								ref={albumImageRef}
								className="pointer-events-auto rounded-4xl"
								style={{
									transformStyle: 'preserve-3d',
								}}
							>
								<div ref={albumArtRef}>
									<Image
										src={data?.albumImageUrl || "/default-image.jpg"}
										alt={`${data?.title || "No Title"} [${data?.artist || "No Artist"}]`}
										width={450}
										height={450}
										className="relative shadow-2xl w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[380px] md:h-[380px] lg:w-[450px] lg:h-[450px] rounded-4xl"
										style={{
											transform: 'translateZ(50px)',
										}}
									/>
								</div>
							</div>
						</div>

						<div
							ref={textContainerRef}
							className="flex flex-col gap-3 md:gap-4 text-center lg:text-left items-center lg:items-start max-w-xl lg:max-w-none"
						>
							<h2
								ref={titleRef}
								className="text-xl sm:text-2xl lg:text-3xl font-extrabold italic inline drop-shadow-md text-[var(--color-secondary)]"
							>
								Now Playing
							</h2>
							<div className="w-full">
								<h2
									ref={trackTitleRef}
									className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[var(--color-vibrant-safe)] leading-tight break-words"
								>
									{data?.title || "Unknown Title"}
								</h2>
								<h4
									ref={artistRef}
									className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-semibold text-[var(--color-vibrant-safe)] break-words"
								>
									{data?.artist || "Unknown Artist"}
								</h4>
							</div>

							{/* Spotify Link with hover effect */}
							<a
								href={data?.songUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="group flex items-center gap-0 px-2 py-2 rounded-lg transition-all mt-2 md:mt-4 bg-[var(--color-primary)]/80 hover:bg-[var(--color-primary)] hover:gap-2 hover:px-4 border border-[var(--color-border)] pointer-events-auto w-fit"
							>
								<FaSpotify size={20} className="text-[var(--color-text-primary)] flex-shrink-0" />
								<span className="text-sm font-medium text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 whitespace-nowrap">
									Open in Spotify
								</span>
							</a>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Render internal pages version (minimal, bottom-right corner)
	if (!isHomePage && data?.isPlaying) {
		return (
			<div className="fixed bottom-6 right-6 pointer-events-none z-5">
				<div className="flex items-center gap-3 bg-black/20 backdrop-blur-md rounded-xl p-3 border border-[var(--color-border)]/30">
					{/* Mini Album Art */}
					<div className="relative w-12 h-12 rounded-lg overflow-hidden">
						<Image
							src={data?.albumImageUrl || "/default-image.jpg"}
							alt={`${data?.title || "No Title"}`}
							width={48}
							height={48}
							className="object-cover"
						/>
					</div>

					{/* Mini Track Info */}
					<div className="flex flex-col max-w-[200px]">
						<p className="text-xs font-medium text-[var(--color-text-secondary)] truncate opacity-70">
							{data?.title || "Unknown Title"}
						</p>
						<p className="text-[10px] text-[var(--color-text-primary)]/60 truncate">
							{data?.artist || "Unknown Artist"}
						</p>
					</div>

					{/* Mini Spotify Link */}
					<a
						href={data?.songUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="group pointer-events-auto p-2 rounded-lg hover:bg-[var(--color-primary)]/20 transition-all"
						title="Open in Spotify"
					>
						<FaSpotify size={16} className="text-[var(--color-primary)]/60 group-hover:text-[var(--color-primary)] transition-colors" />
					</a>
				</div>
			</div>
		);
	}

	return null;
};

export default NowPlaying;