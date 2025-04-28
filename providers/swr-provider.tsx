'use client';
import { SWRConfig } from 'swr'

type swrProviderProps = {
	children: React.ReactNode;
}
export const SWRProvider = ({ children }: swrProviderProps) => {
	return <SWRConfig>{children}</SWRConfig>
};