import Link from "next/link";

const Navigation = () => {
	return(
		<nav>
			<div className="h-full flex items-stretch">
				<Link className="w-1/2 bg-green-800/20 flex items-center justify-center hover:bg-gray-600 hover:bg-gray-600/25 text-xl font-black uppercase tracking-widest" href={'/top-tracks'}>Top Tracks</Link>
				<Link className="w-1/2 bg-green-800/20 flex items-center justify-center hover:bg-gray-600 hover:bg-gray-600/25 text-xl font-black uppercase tracking-widest" href={'/artists'}>Top Artists</Link>
			</div>
		</nav>
		
	)
}

export default Navigation;