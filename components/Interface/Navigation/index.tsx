'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LuShuffle, LuHouse } from "react-icons/lu";
import { useVisualizer } from "@/contexts/VisualizerContext";
import MiniNowPlaying from "@/components/NowPlaying/MiniNowPlaying";

// Animate the anchor itself so hover and tap track the interactive element
// rather than a wrapper around it.
const MotionLink = motion.create(Link);

type VisualizerType = 'retro' | 'waveform' | 'radar' | 'matrix' | 'tunnel' | 'orbs';
const VISUALIZERS: VisualizerType[] = ['retro', 'waveform', 'radar', 'matrix', 'tunnel', 'orbs'];

const navItems = [
	{ href: "/", label: "Home" },
	{ href: "/insights", label: "Insights" },
	{ href: "/tracks-3d", label: "3D Tracks" },
	{ href: "/taste-profile", label: "Taste" },
	{ href: "/stats", label: "Stats" },
	{ href: "/top-tracks", label: "Top Tracks" },
];

const iconButtonClasses = `
	relative w-11 h-11 rounded-lg border-2 flex items-center justify-center
	bg-[var(--color-bg-2)]/80 backdrop-blur-md
	text-[var(--color-text-secondary)] border-[var(--color-border)]
	hover:text-[var(--color-text-primary)] hover:bg-[var(--color-primary)]/40
	hover:border-[var(--color-accent)] hover:shadow-layered-sm
	transition-colors duration-200
`;

const activeIconButtonClasses = `
	relative w-11 h-11 rounded-lg border-2 flex items-center justify-center
	bg-[var(--color-primary)] backdrop-blur-md
	text-[var(--color-text-primary)] border-[var(--color-accent)] shadow-layered-accent
	transition-colors duration-200
`;

const Navigation = () => {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const [isHamburgerHovered, setIsHamburgerHovered] = useState(false);
	const [shuffleSpins, setShuffleSpins] = useState(0);
	const { activeVisualizer, setActiveVisualizer } = useVisualizer();
	const reduceMotion = useReducedMotion();
	const hamburgerRef = useRef<HTMLButtonElement>(null);

	const shuffleVisualizer = () => {
		const others = VISUALIZERS.filter((v) => v !== activeVisualizer);
		const next = others[Math.floor(Math.random() * others.length)];
		setActiveVisualizer(next);
		setShuffleSpins((n) => n + 1);
	};

	const closeMenu = () => {
		setIsOpen(false);
		hamburgerRef.current?.focus();
	};

	// Close on Escape and lock body scroll while the panel is open
	useEffect(() => {
		if (!isOpen) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") closeMenu();
		};

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [isOpen]);

	const getRowClasses = (isActive: boolean) => {
		if (isActive) {
			return "bg-[var(--color-primary)] text-[var(--color-text-primary)] border-[var(--color-accent)] shadow-layered-accent";
		}
		return "bg-nav-row bg-nav-row-hover text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:shadow-layered-sm";
	};

	const iconHover = reduceMotion ? undefined : { scale: 1.08, y: -2 };
	const iconTap = reduceMotion ? undefined : { scale: 0.92 };
	const iconSpring = { type: "spring" as const, stiffness: 400, damping: 18 };

	// Bar geometry for the hamburger: rest, hover, and open (X) states
	const barSpring = reduceMotion
		? { duration: 0.15 }
		: { type: "spring" as const, stiffness: 460, damping: 26 };

	// Bars are a fixed 20px wide and scale on the X axis. Animating `width`
	// here drives layout and can settle at a wrong value; scaleX cannot.
	const topBar = isOpen
		? { rotate: 45, y: 7, scaleX: 1, opacity: 1 }
		: { rotate: 0, y: isHamburgerHovered ? -1 : 0, scaleX: isHamburgerHovered ? 1 : 0.9, opacity: 1 };

	const middleBar = isOpen
		? { opacity: 0, scaleX: 0.9 }
		: { opacity: 1, scaleX: isHamburgerHovered ? 0.6 : 0.9 };

	const bottomBar = isOpen
		? { rotate: -45, y: -7, scaleX: 1, opacity: 1 }
		: { rotate: 0, y: isHamburgerHovered ? 1 : 0, scaleX: isHamburgerHovered ? 1 : 0.9, opacity: 1 };

	const panelList = {
		open: {
			transition: reduceMotion
				? {}
				: { staggerChildren: 0.05, delayChildren: 0.12 },
		},
		closed: {
			transition: reduceMotion
				? {}
				: { staggerChildren: 0.03, staggerDirection: -1 },
		},
	};

	const panelRow = reduceMotion
		? { open: { opacity: 1 }, closed: { opacity: 0 } }
		: {
			open: {
				opacity: 1,
				x: 0,
				transition: { type: "spring" as const, stiffness: 320, damping: 26 },
			},
			closed: {
				opacity: 0,
				x: 32,
				transition: { duration: 0.15 },
			},
		};

	const isHomeActive = pathname === "/";

	return (
		<>
			{/* Control cluster: visualization switch, home, menu toggle */}
			{/* Sits above the panel (z-60) so the toggle stays visible and clickable while open */}
			<div className="fixed top-6 right-6 z-[70] flex items-center gap-3">
				<MiniNowPlaying isHidden={isOpen} />

				<motion.button
					onClick={shuffleVisualizer}
					aria-label="Switch visualization"
					title="Switch visualization"
					whileHover={iconHover}
					whileTap={iconTap}
					transition={iconSpring}
					className={iconButtonClasses}
				>
					<motion.span
						animate={reduceMotion ? undefined : { rotate: shuffleSpins * 360 }}
						transition={{ type: "spring", stiffness: 220, damping: 16 }}
						className="inline-flex"
					>
						<LuShuffle className="w-5 h-5" />
					</motion.span>
				</motion.button>

				<MotionLink
					href="/"
					aria-label="Home"
					title="Home"
					aria-current={isHomeActive ? "page" : undefined}
					whileHover={iconHover}
					whileTap={iconTap}
					transition={iconSpring}
					className={isHomeActive ? activeIconButtonClasses : iconButtonClasses}
				>
					<LuHouse className="w-5 h-5" />
				</MotionLink>

				<motion.button
					ref={hamburgerRef}
					onClick={() => (isOpen ? closeMenu() : setIsOpen(true))}
					onHoverStart={() => setIsHamburgerHovered(true)}
					onHoverEnd={() => setIsHamburgerHovered(false)}
					onFocus={() => setIsHamburgerHovered(true)}
					onBlur={() => setIsHamburgerHovered(false)}
					aria-label={isOpen ? "Close menu" : "Open menu"}
					aria-expanded={isOpen}
					aria-controls="primary-navigation"
					whileTap={iconTap}
					transition={iconSpring}
					className={iconButtonClasses}
				>
					<span className="flex flex-col items-center justify-center gap-[5px]">
						<motion.span
							animate={topBar}
							transition={barSpring}
							className="block w-5 h-[2px] rounded-full bg-current"
						/>
						<motion.span
							animate={middleBar}
							transition={barSpring}
							className="block w-5 h-[2px] rounded-full bg-current"
						/>
						<motion.span
							animate={bottomBar}
							transition={barSpring}
							className="block w-5 h-[2px] rounded-full bg-current"
						/>
					</span>
				</motion.button>
			</div>

			{/* Off-canvas navigation */}
			<AnimatePresence>
				{isOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={closeMenu}
							className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
						/>

						<motion.nav
							id="primary-navigation"
							aria-label="Primary"
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={
								reduceMotion
									? { duration: 0.2 }
									: { type: "spring", damping: 25, stiffness: 200 }
							}
							className="fixed top-0 right-0 bottom-0 w-88 max-w-[90vw] z-[60] overflow-y-auto overscroll-contain"
						>
							{/*
							  The nav is 32px wider than the painted surface so rows can hang
							  past the panel's left edge without being clipped: a scroll
							  container clips both axes, so the overhang has to live inside it.
							  Surface starts at left-8 (32px); rows start at pl-3 (12px), so
							  every row overhangs by 20px and the active/hovered row, nudged a
							  further 12px, reaches the container edge at 32px.
							*/}
							<div className="relative min-h-full">
								<div
									aria-hidden
									className="absolute inset-y-0 right-0 left-8 bg-[var(--color-bg-1)]/95 backdrop-blur-lg border-l border-[var(--color-border)]"
								/>
								<div className="relative pt-24 pb-6 pl-3 pr-8">
								{/*<h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6 pl-6">Menu</h2>*/}
								<motion.div
									variants={panelList}
									initial="closed"
									animate="open"
									exit="closed"
									className="flex flex-col gap-3"
								>
									{navItems.map((item) => {
										const isActive = pathname === item.href;
										return (
											<motion.div key={item.href} variants={panelRow}>
												<Link
													href={item.href}
													onClick={() => setIsOpen(false)}
													aria-current={isActive ? "page" : undefined}
													className={`
														relative block px-6 py-4 font-bold rounded-lg
														border-2 transition-[colors,transform] duration-200
														motion-reduce:transition-none
														${isActive ? '-translate-x-3' : 'hover:-translate-x-3 focus-visible:-translate-x-3'}
														${getRowClasses(isActive)}
													`}
												>
													{item.label}
													{isActive && (
														<span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/50 rounded-r" />
													)}
												</Link>
											</motion.div>
										);
									})}

									<motion.div variants={panelRow}>
										<button
											onClick={() => {
												shuffleVisualizer();
												setIsOpen(false);
											}}
											className={`
												relative w-full px-6 py-4 font-bold rounded-lg
												border-2 transition-[colors,transform] duration-200
												motion-reduce:transition-none
												hover:-translate-x-3 focus-visible:-translate-x-3
												${getRowClasses(false)}
												flex items-center gap-3
											`}
										>
											<LuShuffle className="w-5 h-5" />
											<span>Switch Visualization</span>
										</button>
									</motion.div>
								</motion.div>
								</div>
							</div>
						</motion.nav>
					</>
				)}
			</AnimatePresence>
		</>
	);
};

export default Navigation;
