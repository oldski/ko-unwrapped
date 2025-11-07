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
const Section = ( { artist, track } : details ) => {
	
	if(track){
		return(
			<Image className="border border-gray-50 aspect-square" src={track.coverImage.url} alt={track.title} width={track.coverImage.width} height={track.coverImage.height} />
			// <section className="container mx-auto px-4 bg-amber-900">
			//
			// 	<div className="py-20">
			// 		<h2 className="font-extrabold uppercase">{track.title} </h2>
			// 		<h3 className="font-light lowercase">{track.artist}</h3>
			// 	</div>
			// </section>
		)
	}
	
	// artist
	if(artist){
		
		return(
			<section className="container">
				<div className="block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
					{`${artist?.name}`}
					<Image src={artist?.coverImage.url} alt={artist?.name} width={artist?.coverImage.width} height={artist?.coverImage.height} />
				</div>
			</section>
		)
	}
}

export default Section;