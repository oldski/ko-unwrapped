'use client'
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import Spinner from "@/app/components/Interface/Spinner";
import Image from "next/image";
import Card from "@/app/components/Interface/Card";

const TopArtists = () => {
	const { data, error, isLoading} = useSWR(`${process.env.NEXT_PUBLIC_HOST}/api/top-artists`, fetcher);
	
	if (error) {
		return <div>Error loading data</div>;
	}
	if(isLoading){
		return(
			<div className="text-sm text-gray-100/50 p-3"><Spinner /></div>
		)
	}
	return(
		<>
			<h2>Top Artists</h2>
			<div className="grid grid-cols-5 gap-8">
				{data.map((artist:any, key:number) => <Card key={key} artist={artist} />)}
			</div>
		</>
	)
}

export default TopArtists;