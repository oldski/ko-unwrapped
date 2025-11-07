
const OhSoQuiet = () => {
	
	return(
		<div className="h-screen flex items-center">
			<div className="z-30">
				<h1 className="block drop-shadow-xl  text-2xl lg:text-9xl font-extrabold italic">_silence is golden_</h1>
			</div>
			
			{/*<div className="mix-blend-multiply hue-rotate-90 w-full h-full fixed z-20 bg-gradient-to-r from-amber-200 to-yellow-500" />*/}
			<video autoPlay muted loop className="object-cover w-full h-full fixed -z-2">
				<source src="/video/not-playing.mov" type="video/mp4"/>
			</video>
		</div>
	)
}

export default OhSoQuiet;