'use client'
import Image from "next/image";

interface details{
	artist?: {
		name: string,
		title: string,
		coverImage: {
			url: any,
			width: number,
			height: number,
		}
	};
	track?: {
		title: string,
		artist: string,
		coverImage: {
			url: any,
			width: number,
			height: number,
		}
	};
}
const Card = ( { artist, track } : details ) => {
	
	if(track){
		// <div className="block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
		// 	{`${track.title} [${track.artist}]`} <Image src={track.coverImage.url} alt={track.title} width={track.coverImage.width} height={track.coverImage.height} />
		// </div>
		return(
			<>
				<h3 className="font-extrabold italic text-white opacity-50">01</h3>
				<Image src={track.coverImage.url} alt={track.title} width={track.coverImage.width} height={track.coverImage.height} />
			</>
		)
	}
	
	// artist
	if(artist){
		
		return(
			<div>
				<div className="block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
					{`${artist?.name}`}
					<Image src={artist?.coverImage.url} alt={artist?.name} width={artist?.coverImage.width} height={artist?.coverImage.height} />
				</div>
			</div>
		)
	}
}

export default Card;