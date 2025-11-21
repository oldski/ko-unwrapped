'use client';
import { useState } from 'react';
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import { motion } from 'framer-motion';
import AnimatedCard from '@/components/AnimatedCard';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

const TopTracks = () => {
	const [timeRange, setTimeRange] = useState<'short_term' | 'medium_term' | 'long_term'>('short_term');

	const { data: tracksData, error, isLoading } = useSWR(
		`/api/top-tracks-timerange?time_range=${timeRange}&limit=50`,
		fetcher
	);

	const tracks = tracksData?.items || [];

	const timeRangeLabels = {
		short_term: 'Last 4 Weeks',
		medium_term: 'Last 6 Months',
		long_term: 'All Time'
	};

	if (error) {
		return (
			<div className="min-h-screen text-white p-8">
				<div className="max-w-7xl mx-auto">
					<AnimatedCard opacity="bold" weight="medium">
						<p className="text-[var(--color-text-secondary)]">Error loading data</p>
					</AnimatedCard>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="min-h-screen text-white p-8">
				<div className="max-w-7xl mx-auto">
					<AnimatedCard opacity="bold" weight="medium">
						<div className="flex items-center justify-center h-64">
							<div className="text-center">
								<Spinner size="xl" className="mx-auto mb-4" />
								<p className="text-[var(--color-text-secondary)]">Loading your top tracks...</p>
							</div>
						</div>
					</AnimatedCard>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen text-white p-8">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-5xl font-bold mb-2 text-[var(--color-text-primary)]">
						Your Top
						<span className="text-[var(--color-vibrant-safe)]"> Tracks</span>
					</h1>
					<p className="text-[var(--color-text-secondary)] text-lg">
						Your most played tracks across different time periods
					</p>
				</div>

				{/* Time Range Selector */}
				<div className="flex gap-2 mb-8">
					{(['short_term', 'medium_term', 'long_term'] as const).map((range) => (
						<Button
							key={range}
							variant="secondary"
							isActive={timeRange === range}
							onClick={() => setTimeRange(range)}
						>
							{timeRangeLabels[range]}
						</Button>
					))}
				</div>

				{/* Tracks List */}
				<AnimatedCard opacity="bold" weight="medium">
					<AnimatedCard.Header
						title={`Top ${tracks.length} Tracks`}
						description={`From ${timeRangeLabels[timeRange].toLowerCase()}`}
						icon="🎵"
					/>
					<div className="space-y-3">
						{tracks.map((track: any, index: number) => (
							<motion.div
								key={track.id}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: index * 0.02 }}
								className="flex items-center gap-4 bg-gray-800/30 p-4 rounded-xl hover:bg-gray-800/50 transition-colors group"
							>
								<span className="text-2xl font-bold text-[var(--color-text-secondary)]/50 w-12 text-center">
									#{index + 1}
								</span>
								<img
									src={track.album.images[2]?.url || track.album.images[0]?.url}
									alt={track.album.name}
									className="w-16 h-16 rounded-lg shadow-lg"
								/>
								<div className="flex-1 min-w-0">
									<p className="font-bold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-vibrant-safe)] transition-colors">
										{track.name}
									</p>
									<p className="text-sm text-[var(--color-text-secondary)] truncate">
										{track.artists.map((a: any) => a.name).join(', ')}
									</p>
									<p className="text-xs text-[var(--color-text-secondary)]/70 truncate">
										{track.album.name}
									</p>
								</div>
								<div className="flex items-center gap-3">
									<div className="text-right">
										<div className="flex items-center gap-2">
											<div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
												<div
													className="h-full bg-[var(--color-vibrant-safe)] rounded-full"
													style={{ width: `${track.popularity}%` }}
												/>
											</div>
											<span className="text-sm font-bold text-[var(--color-accent)] w-8">
												{track.popularity}
											</span>
										</div>
									</div>
									{track.external_urls?.spotify && (
										<a
											href={track.external_urls.spotify}
											target="_blank"
											rel="noopener noreferrer"
											className="px-4 py-2 bg-[var(--color-vibrant)]/20 text-[var(--color-vibrant-safe)] font-semibold rounded-lg hover:bg-[var(--color-vibrant)]/40 transition-colors text-sm"
										>
											Play
										</a>
									)}
								</div>
							</motion.div>
						))}
					</div>
				</AnimatedCard>
			</div>
		</div>
	);
}

export default TopTracks;