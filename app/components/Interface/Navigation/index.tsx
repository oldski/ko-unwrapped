import Link from "next/link";

const Navigation = () => {
	return(
		<>
			{/* Navigation Menu */}
			<nav className="fixed top-0 right-0 z-50 p-6">
				<div className="flex gap-6">
					<a
						href="/"
						className="px-4 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors"
					>
						Home
					</a>
					<a
						href="/insights"
						className="px-4 py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-400 transition-colors"
					>
						Insights
					</a>
					<a
						href="/tracks-3d"
						className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors"
					>
						3D Tracks
					</a>
					<a
						href="/taste-profile"
						className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors"
					>
						Taste Profile
					</a>
					<a
						href="/stats"
						className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors"
					>
						Listening Stats
					</a>
					<a
						href="/audio-features"
						className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors"
					>
						Audio Features
					</a>
				</div>
			</nav>
			
			{/*// <nav>*/}
			{/*// 	<div className="h-full flex items-stretch">*/}
			{/*// 		<Link className="w-1/2 bg-green-800/20 flex items-center justify-center hover:bg-gray-600 hover:bg-gray-600/25 text-xl font-black uppercase tracking-widest" href={'/top-tracks'}>Top Tracks</Link>*/}
			{/*// 		<Link className="w-1/2 bg-green-800/20 flex items-center justify-center hover:bg-gray-600 hover:bg-gray-600/25 text-xl font-black uppercase tracking-widest" href={'/artists'}>Top Artists</Link>*/}
			{/*// 	</div>*/}
			{/*// </nav>*/}
		</>
		
		
	)
}

export default Navigation;