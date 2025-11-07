import React, { useEffect } from "react";

const NoiseOverlay: React.FC = () => {
	useEffect(() => {
		const canvas = document.getElementById("noise-canvas") as HTMLCanvasElement | null;
		
		if (!canvas) {
			console.error("Canvas element not found");
			return;
		}
		
		const ctx = canvas.getContext("2d");
		
		if (!ctx) {
			console.error("Failed to get 2D context");
			return;
		}
		
		const setCanvasSize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
		
		setCanvasSize();
		
		let lastFrameTime = 0; // Timestamp of the last frame
		const frameInterval = 10; // Interval in milliseconds (100ms = 10 FPS)
		
		const generateNoise = () => {
			const imageData = ctx.createImageData(canvas.width, canvas.height);
			for (let i = 0; i < imageData.data.length; i += 4) {
				const value = Math.random() * 255;
				imageData.data[i] = value; // R
				imageData.data[i + 1] = value; // G
				imageData.data[i + 2] = value; // B
				imageData.data[i + 3] = 255; // A (opacity)
			}
			ctx.putImageData(imageData, 0, 0);
		};
		
		const noiseLoop = (timestamp: number) => {
			if (timestamp - lastFrameTime >= frameInterval) {
				generateNoise();
				lastFrameTime = timestamp;
			}
			requestAnimationFrame(noiseLoop);
		};
		
		requestAnimationFrame(noiseLoop);
		
		window.addEventListener("resize", setCanvasSize);
		
		return () => {
			window.removeEventListener("resize", setCanvasSize);
		};
	}, []);
	
	return (
		<canvas
			id="noise-canvas"
			className="fixed inset-0 pointer-events-none opacity-10"
			style={{
				zIndex: -1,
				position: "fixed",
			}}
		/>
	);
};

export default NoiseOverlay;
