import {motion} from "framer-motion";

const TriangleBackground = ({children}) => {
	
	return(
		<>
			{children}
			<div className="fixed top-0 h-screen w-screen z-0">
				<div className="relative mx-auto">
					{/*<div*/}
					{/*	className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>*/}
					{/*<div*/}
					{/*	className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>*/}
					{/*<div*/}
					{/*	className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>*/}
					
					<div className="w-0 h-0 top-5 left-4 mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay
  border-l-[40vh] border-l-transparent
  border-t-[80vh] border-t-red-500
  border-r-[40vh] border-r-transparent" />
					
					<div className="w-0 h-0 top-60 left-16 mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000
  border-t-[30vh] border-t-transparent
  border-r-[60vh] border-r-blue-500
  border-b-[30vh] border-b-transparent">
					</div>
					
					<div className="w-0 h-0 absolute mx-auto mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000
  border-l-[60vh] border-l-transparent
  border-b-[120vh] border-b-yellow-500
  border-r-[60vh] border-r-transparent">
					</div>
				</div>
			</div>
		</>
	);
}

export default TriangleBackground;