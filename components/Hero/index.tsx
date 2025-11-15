'use client'
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import Spinner from "@/components/Interface/Spinner";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

const Hero = () => {
	const { data, isLoading } = useSWR(`${process.env.NEXT_PUBLIC_HOST}/api/spotify-profile`, fetcher);
	const pathname = usePathname();
	const isHomePage = pathname === '/';

	return (
		<div className="relative z-10">
			{data && (
				<>
					{/* Mobile/Tablet: Vertical text on bottom left */}
					<motion.h1
						initial={{ opacity: 0, x: -50 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.8, delay: 0.5 }}
						className="lg:hidden fixed left-[-1px] bottom-[-1px] font-extrabold font-mono italic text-[var(--color-primary)] text-4xl md:text-6xl mix-blend-multiply z-20 [writing-mode:vertical-lr] rotate-360 origin-center"
					>
						__<a target="_blank" style={{mixBlendMode:'overlay'}} className="mix-blend-overlay hover:mix-blend-exclusion hover:bg-white hover:text-[var(--color-accent)] hover:duration-300" href={data.external_urls?.spotify}>{data.display_name}</a>_UNWRAPPED__
					</motion.h1>

					{/* Desktop: Horizontal text at bottom */}
					<motion.h1
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.5 }}
						className="hidden backdrop-blur-3xl lg:block fixed bottom-0 left-[-10] font-extrabold font-mono italic text-[var(--color-primary)] text-8xl mix-blend-multiply z-20 px-4"
					>
						__<a target="_blank" className="mix-blend-hue hover:mix-blend-exclusion hover:text-[var(--color-vibrant)] hover:duration-300" href={data.external_urls?.spotify}>{data.display_name}</a>_UNWRAPPED__
					</motion.h1>
				</>
			)}
		</div>
	)
}

export default Hero;