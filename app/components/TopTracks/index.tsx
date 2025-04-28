'use client'
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import Spinner from "@/app/components/Interface/Spinner";
import Card from "@/app/components/Interface/Card";

const TopTracks = () => {
	const { data, error, isLoading} = useSWR(`${process.env.NEXT_PUBLIC_HOST}/api/top-tracks`, fetcher);
	if (error) {
		return <div>Error loading data</div>;
	}
	if(isLoading){
		return(
			<div className="text-sm text-gray-100/50 p-3"><Spinner /></div>
		)
	}
	return(
		<div className="flex items-center">
			<div className="">
				<h2>Top Tracks</h2>
			</div>
			<div className="h-screen">
				<div className="h-full">
					{data.map((track:any, key:number) => <Card key={key} track={track} />)}
				</div>
			</div>
		</div>
	)
}

export default TopTracks;