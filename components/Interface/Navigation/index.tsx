'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuShuffle } from "react-icons/lu";
import { useVisualizer } from "@/contexts/VisualizerContext";

type VisualizerType = 'retro' | 'waveform' | 'radar' | 'matrix' | 'tunnel' | 'orbs';
const VISUALIZERS: VisualizerType[] = ['retro', 'waveform', 'radar', 'matrix', 'tunnel', 'orbs'];

const Navigation = () => {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const [shuffleSpins, setShuffleSpins] = useState(0);
	const { activeVisualizer, setActiveVisualizer } = useVisualizer();

	const shuffleVisualizer = () => {
		const others = VISUALIZERS.filter((v) => v !== activeVisualizer);
		const next = others[Math.floor(Math.random() * others.length)];
		setActiveVisualizer(next);
		setShuffleSpins((n) => n + 1);
	};

	const navItems = [
		{ href: "/", label: "Home", color: "gray" },
		{ href: "/insights", label: "Insights", color: "purple" },
		{ href: "/tracks-3d", label: "3D Tracks", color: "cyan" },
		{ href: "/taste-profile", label: "Taste", color: "pink" },
		{ href: "/stats", label: "Stats", color: "green" },
		{ href: "/top-tracks", label: "Top Tracks", color: "orange" },
	];

	const getColorClasses = (isActive: boolean) => {
		if (isActive) {
			return "bg-[var(--color-primary)] text-[var(--color-text-primary)] border-[var(--color-accent)] shadow-layered-accent";
		}
		return "bg-[var(--color-primary)]/20 text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-primary)]/40 hover:border-[var(--color-accent)] hover:shadow-layered-sm";
	};

	return (
		<>
			{/* Mobile Menu Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="fixed top-6 right-6 z-[60] lg:hidden bg-[var(--color-bg-2)]/90 backdrop-blur-md border border-[var(--color-border)] text-[var(--color-text-primary)] p-3 rounded-lg hover:bg-[var(--color-primary)]/40 transition-all duration-200"
				aria-label="Toggle menu"
			>
				<svg
					className="w-6 h-6"
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					{isOpen ? (
						<path d="M6 18L18 6M6 6l12 12" />
					) : (
						<path d="M4 6h16M4 12h16M4 18h16" />
					)}
				</svg>
			</button>

			{/* Desktop Navigation */}
			<nav className="hidden lg:block fixed top-0 right-0 z-50 p-6">
				<div className="flex gap-3">
					<motion.button
						onClick={shuffleVisualizer}
						aria-label="Switch visualization"
						title="Switch visualization"
						whileHover={{ scale: 1.08, rotate: -4 }}
						whileTap={{ scale: 0.92, rotate: 0 }}
						transition={{ type: "spring", stiffness: 400, damping: 18 }}
						className={`
							relative px-4 py-2 font-bold rounded-lg
							border-2
							${getColorClasses(false)}
							flex items-center justify-center
						`}
					>
						<motion.span
							animate={{ rotate: shuffleSpins * 360 }}
							transition={{ type: "spring", stiffness: 220, damping: 16 }}
							className="inline-flex"
						>
							<LuShuffle className="w-5 h-5" />
						</motion.span>
					</motion.button>
					{navItems.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`
									relative px-4 py-2 font-bold rounded-lg
									border-2 transition-all duration-200
									${getColorClasses(isActive)}
									// ${isActive ? 'shadow-lg scale-105' : 'hover:scale-105'}
								`}
							>
								{item.label}
								{isActive && (
									<motion.div
										layoutId="activeTab"
										className="absolute inset-0 bg-white/10 rounded-lg -z-10"
										transition={{ type: "spring", duration: 0.5 }}
									/>
								)}
							</Link>
						);
					})}
				</div>
			</nav>

			{/* Mobile Navigation Menu */}
			<AnimatePresence>
				{isOpen && (
					<>
						{/* Backdrop */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setIsOpen(false)}
							className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
						/>

						{/* Menu */}
						<motion.nav
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ type: "spring", damping: 25, stiffness: 200 }}
							className="fixed top-0 right-0 bottom-0 w-80 bg-[var(--color-bg-1)]/95 backdrop-blur-lg border-l border-[var(--color-border)] z-[60] lg:hidden overflow-y-auto"
						>
							<div className="p-6 pt-20">
								<h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">Menu</h2>
								<div className="flex flex-col gap-3">
									<motion.button
										onClick={() => {
											shuffleVisualizer();
											setIsOpen(false);
										}}
										whileHover={{ scale: 1.03 }}
										whileTap={{ scale: 0.96 }}
										transition={{ type: "spring", stiffness: 400, damping: 18 }}
										className={`
											relative px-6 py-4 font-bold rounded-lg
											border-2
											${getColorClasses(false)}
											flex items-center gap-3
										`}
									>
										<motion.span
											animate={{ rotate: shuffleSpins * 360 }}
											transition={{ type: "spring", stiffness: 220, damping: 16 }}
											className="inline-flex"
										>
											<LuShuffle className="w-5 h-5" />
										</motion.span>
										<span>Switch Visualization</span>
									</motion.button>
									{navItems.map((item) => {
										const isActive = pathname === item.href;
										return (
											<Link
												key={item.href}
												href={item.href}
												onClick={() => setIsOpen(false)}
												className={`
													relative px-6 py-4 font-bold rounded-lg
													border-2 transition-all duration-200
													${getColorClasses(isActive)}
													${isActive ? 'shadow-lg' : ''}
												`}
											>
												{item.label}
												{isActive && (
													<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/50 rounded-r" />
												)}
											</Link>
										);
									})}
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
