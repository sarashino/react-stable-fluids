import { useState, useEffect } from 'react';
import { Vector2 } from 'three';

export interface Mouse {
	coords: Vector2;
	coords_old: Vector2;
	diff: Vector2;
}

const useMouseTracker = (): Mouse => {
	const [coords, setCoordsState] = useState(() => new Vector2());
	const [prevCoords, setPrevCoords] = useState(() => new Vector2());
	const [diff, setDiff] = useState(() => new Vector2());

	const setCoords = (x: number, y: number) => {
		setPrevCoords(coords.clone());
		setCoordsState(new Vector2((x / window.innerWidth) * 2 - 1, - (y / window.innerHeight) * 2 + 1));
	};

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			setCoords(event.clientX, event.clientY);
			setDiff(coords.clone().sub(prevCoords));
		};
		const handleTouch = (event: TouchEvent) => {
			if (event.touches.length === 1) {
				setCoords(event.touches[0].pageX, event.touches[0].pageY);
			}
			setDiff(coords.clone().sub(prevCoords));
		}

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('touchstart', handleTouch);
		window.addEventListener('touchmove', handleTouch);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('touchstart', handleTouch);
			window.removeEventListener('touchmove', handleTouch);
		};
	}, [coords]);

	return { coords, coords_old: prevCoords, diff };
};

export default useMouseTracker;
