import useSWR from "swr";
import fetcher from "@/lib/fetcher";

export default function useFetchWithSWR(url: string) {
	const { data, error } = useSWR(url, fetcher);
	
	return {
		data,
		isLoading: !error && !data,
		isError: error,
	} as {
		data: any;
		isLoading: boolean;
		isError: any;
	};
}