'use client';

import Image from "next/image";
import useSWR from "swr";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FaSpotify } from "react-icons/fa6";
import fetcher from "@/lib/fetcher";

type MiniNowPlayingProps = {
	/** Hidden while the off-canvas menu covers the screen. */
	isHidden?: boolean;
};

/**
 * Compact now-playing readout for internal pages. Rendered inside the
 * Navigation control cluster so it shares the cluster's sizing and tokens.
 */
const MiniNowPlaying: React.FC<MiniNowPlayingProps> = ({ isHidden = false }) => {
	const pathname = usePathname();
	const isHomePage = pathname === '/';
	const reduceMotion = useReducedMotion();

	const { data } = useSWR(
		`${process.env.NEXT_PUBLIC_HOST}/api/now-playing`,
		fetcher,
		{ refreshInterval: 45000 }
	);

	// The homepage renders its own full-screen now-playing treatment
	if (isHomePage || !data?.title) return null;

	const title = data?.title || "Unknown Title";
	const artist = data?.artist || "Unknown Artist";

	return (
		<AnimatePresence>
			{!isHidden && (
				<motion.div
					initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
					animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
					exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
					transition={
						reduceMotion
							? { duration: 0.15 }
							: { type: "spring", stiffness: 320, damping: 28 }
					}
					className="pointer-events-none h-11 flex items-stretch overflow-hidden rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-bg-2)]/80 backdrop-blur-md"
				>
					{/* Album art doubles as the Spotify link when the text is hidden */}
					<a
						href={data?.songUrl}
						target="_blank"
						rel="noopener noreferrer"
						title={`${title} — ${artist}`}
						aria-label={`Open ${title} by ${artist} in Spotify`}
						className="pointer-events-auto relative w-11 flex-shrink-0"
					>
						<Image
							src={data?.albumImageUrl || "/default-image.jpg"}
							alt=""
							width={44}
							height={44}
							className="w-full h-full object-cover"
						/>
					</a>

					<div className="hidden sm:flex items-center gap-2 pl-3 pr-2">
						<div className="flex flex-col justify-center min-w-0 max-w-[180px]">
							<p className="text-xs font-medium text-[var(--color-text-primary)] truncate leading-tight">
								{title}
							</p>
							<p className="text-[10px] text-[var(--color-text-secondary)] truncate leading-tight">
								{artist}
							</p>
						</div>

						<a
							href={data?.songUrl}
							target="_blank"
							rel="noopener noreferrer"
							title="Open in Spotify"
							aria-label="Open in Spotify"
							className="group pointer-events-auto p-2 rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors"
						>
							<FaSpotify
								size={16}
								className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors"
							/>
						</a>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default MiniNowPlaying;
