import { Canvas } from "@react-three/fiber";

import Output, { type OutputProps } from "./FluidOverlay/Output";

export interface FluidOverlayProps {
	options: OutputProps;
}

const FluidOverlay = ({
	options = {
		iterations_poisson: 32,
		iterations_viscous: 64,
		mouse_force: 120,
		resolution: 0.5,
		cursor_size: 100,
		viscous: 150,
		isBounce: true,
		dt: 0.014,
		BFECC: true,
	},
}: FluidOverlayProps) => {
	return (
		<Canvas
			onCreated={({ gl }) => {
				gl.autoClear = false;
			}}
		>
			<Output options={options} />
		</Canvas>
	);
};

export default FluidOverlay;
