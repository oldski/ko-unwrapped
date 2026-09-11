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

/*
 * The cluster read --color-primary/accent/bg-2, which are visualiser tokens
 * held fixed on purpose, so every hover and active state here stayed cyan
 * whatever was playing. On the ink/surface family it tracks the artwork.
 */
const iconButtonClasses = `
	relative w-11 h-11 rounded-lg border-2 flex items-center justify-center
	bg-[var(--surface-panel)]/80 backdrop-blur-md
	text-[var(--ink-muted)] border-[var(--line)]
	hover:text-[var(--ink-primary)] hover:bg-[var(--surface-raised)]
	hover:border-[var(--ink-signal)] hover:shadow-layered-sm
	transition-colors duration-200
`;

const activeIconButtonClasses = `
	relative w-11 h-11 rounded-lg border-2 flex items-center justify-center
	bg-[var(--surface-signal)] backdrop-blur-md
	text-[var(--ink-on-signal)] border-[var(--ink-signal)] shadow-layered-accent
	transition-colors duration-200
`;

const Navigation = () => {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const [isHamburgerHovered, setIsHamburgerHovered] = useState(false);
	const [shuffleSpins, setShuffleSpins] = useState(0);
	const { activeVisualizer, setActiveVisualizer, bpm } = useVisualizer();
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
		// Lets the wordmark drop its blend mode while the menu is open; see
		// `.menu-open` in globals.css. A class avoids threading this one flag
		// through a context just so two fixed elements can agree.
		document.body.classList.add("menu-open");
		window.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			document.body.classList.remove("menu-open");
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [isOpen]);

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
							/*
							 * Gradient scrim, not a flat blur.
							 *
							 * A 60% black wash with backdrop-blur dimmed the visualiser to
							 * nothing across the whole screen, which is the opposite of what
							 * this menu is for. This darkens only the right edge, where the
							 * type sits, and clears to nothing on the left so the
							 * visualisation keeps running in view.
							 *
							 * The right end is deliberately heavy: at 88% black a
							 * full-white visualiser frame still leaves ink-primary above
							 * 5:1, so legibility does not depend on what is being drawn.
							 */
							className="fixed inset-0 z-[55] bg-gradient-to-r from-transparent via-black/45 to-black/[0.88]"
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
							style={{ ['--beat' as string]: `${60 / Math.max(bpm, 40)}s` }}
						>
							{/*
							  No panel behind the menu. The rows sit directly on the live
							  visualiser, which is the thing this app is actually about; a
							  slab of flat colour was hiding it and covering the wordmark in
							  the bottom-right corner.
							  Legibility comes from the rows' own solid fills plus the
							  backdrop scrim, not from a surface. The container stays wider
							  than the rows so the selection nudge has somewhere to go: a
							  scroll container clips both axes.
							*/}
							<div className="relative min-h-full">
								<div className="relative pt-24 pb-6 pl-3 pr-8">
								<motion.div
									variants={panelList}
									initial="closed"
									animate="open"
									exit="closed"
									className="flex flex-col gap-2 items-start"
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
														group relative flex items-center gap-3 py-1
														font-display text-3xl sm:text-4xl
														transition-[color,transform] duration-200
														motion-reduce:transition-none
														${isActive
															? 'text-[var(--ink-signal)] -translate-x-3'
															: 'text-[var(--ink-primary)] hover:-translate-x-3 focus-visible:-translate-x-3'}
													`}
												>
													{/*
													  A rule rather than a fill marks the current page.
													  Every item stays at full ink: dimming the others
													  would put them below 4.5:1 whenever the visualiser
													  runs bright behind them.
													*/}
													<span
														aria-hidden
														className={`
															block w-[3px] rounded-full transition-all duration-200
															${isActive
																? 'h-8 bg-[var(--ink-signal)]'
																: 'h-0 bg-[var(--ink-primary)] group-hover:h-8'}
														`}
													/>
													<span
														className={`nav-echo${isActive ? ' nav-echo--active' : ''}`}
														data-echo={item.label}
													>
														{item.label}
													</span>
												</Link>
											</motion.div>
										);
									})}

									<motion.div variants={panelRow} className="pt-4">
										<button
											onClick={() => {
												shuffleVisualizer();
												setIsOpen(false);
											}}
											className="
												group flex items-center gap-3 text-sm
												text-[var(--ink-muted)] hover:text-[var(--ink-primary)]
												transition-[color,transform] duration-200
												motion-reduce:transition-none
												hover:-translate-x-3 focus-visible:-translate-x-3
											"
										>
											<LuShuffle className="w-4 h-4" />
											<span>Switch visualization</span>
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
