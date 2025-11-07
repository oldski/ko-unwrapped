'use client';
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import React from "react";

interface BackgroundProps {
	children: React.ReactNode;
}

const Background = ({ children }: BackgroundProps) => {
	const ref = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState({ x: 0, y: 0 });

	const mouseMove = (e: React.MouseEvent) => {
		if (!ref.current) return;
		const { clientX, clientY } = e;
		const { width, height, left, top } = ref.current.getBoundingClientRect();
		const x = clientX - (left + width / 2);
		const y = clientY - (top + height / 2);
		setPosition({ x, y });
	}

	const mouseLeave = () => {
		setPosition({ x: 0, y: 0 });
	}
	
	const {x, y} = position;
	return (
		<motion.div
			onMouseMove={mouseMove}
			onMouseLeave={mouseLeave}
			ref={ref}
			animate = {{x,y}}
			transition={{type: "spring", stiffness: 150, damping: 15, mass: 0.1}}
		>
			{children}
		</motion.div>
	)
}

export default Background;