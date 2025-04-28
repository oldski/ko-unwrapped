import { FaSpinner } from "react-icons/fa6";
import {motion} from "framer-motion";

interface SpinnerProps{
	size?:number;
}
const Spinner = ({size}: SpinnerProps) => {
	return(
		
		<motion.div
			animate={{
				rotate: [0, 360],  // Rotate 360 degrees
			}}
			transition={{
				duration: 1.8,  // Duration of the animation (in seconds)
				ease: 'easeIn',  // Easing function for a smoother effect
				repeat: Infinity,  // Repeat the animation indefinitely
			}}
			className="w-10"
		>
			<FaSpinner size={size} />
		</motion.div>
	)
}

export default Spinner;