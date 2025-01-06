import React, {
	useRef,
	useEffect,
	useMemo,
	forwardRef,
	useImperativeHandle,
	useState,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import useMouseTracker from "./MouseTracker";

interface ExternalForcePassProps {
	dst: THREE.WebGLRenderTarget;
	cellScale: THREE.Vector2;
	cursorSize: number;
	mouseForce: number;
}
interface ExternalForcePassHandle {
	render: () => void;
}

const mouse_vert = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;
uniform vec2 center;
uniform vec2 scale;
uniform vec2 px;
varying vec2 vUv;

void main(){
    vec2 pos = position.xy * scale * 2.0 * px + center;
    vUv = uv;
    gl_Position = vec4(pos, 0.0, 1.0);
}
	`;
const external_force_frag = `
precision highp float;

uniform vec2 force;
uniform vec2 center;
uniform vec2 scale;
uniform vec2 px;
varying vec2 vUv;

void main(){
    vec2 circle = (vUv - 0.5) * 2.0;
    float d = 1.0-min(length(circle), 1.0);
    d *= d;
    gl_FragColor = vec4(force * d, 0, 1);
}
	`;
const ExternalForcePass = forwardRef<
	ExternalForcePassHandle,
	ExternalForcePassProps
>(({ dst, cellScale, cursorSize, mouseForce }, ref) => {
	const { gl } = useThree();
	const scene = useMemo(() => new THREE.Scene(), []);
	const camera = useMemo(() => new THREE.Camera(), []);
	const mouseStat = useMouseTracker();
	const [mouse, setMouse] = useState<THREE.Mesh | null>(null);

	const uniformsRef = useRef({
		px: {
			value: cellScale,
		},
		force: {
			value: new THREE.Vector2(0.0, 0.0),
		},
		center: {
			value: new THREE.Vector2(0.0, 0.0),
		},
		scale: {
			value: new THREE.Vector2(cursorSize, cursorSize),
		},
	});

	useEffect(() => {
		const material = new THREE.RawShaderMaterial({
			vertexShader: mouse_vert,
			fragmentShader: external_force_frag,
			blending: THREE.AdditiveBlending,
			uniforms: uniformsRef.current,
		});
		const geometry = new THREE.PlaneGeometry(1, 1);
		setMouse(new THREE.Mesh(geometry, material));
	}, []);

	useEffect(() => {
		if (mouse) scene.add(mouse);
	}, [mouse]);

	const render = () => {
		const forceX = (mouseStat.diff.x / 2) * mouseForce;
		const forceY = (mouseStat.diff.y / 2) * mouseForce;
		mouseStat.diff.set(0, 0);

		const cursorSizeX = cursorSize * cellScale.x;
		const cursorSizeY = cursorSize * cellScale.y;

		const centerX = Math.min(
			Math.max(mouseStat.coords.x, -1 + cursorSizeX + cellScale.x * 2),
			1 - cursorSizeX - cellScale.x * 2,
		);
		const centerY = Math.min(
			Math.max(mouseStat.coords.y, -1 + cursorSizeY + cellScale.y * 2),
			1 - cursorSizeY - cellScale.y * 2,
		);

		uniformsRef.current.force.value.set(forceX, forceY);
		uniformsRef.current.center.value.set(centerX, centerY);
		uniformsRef.current.scale.value.set(cursorSize, cursorSize);

		gl.setRenderTarget(dst);
		gl.render(scene, camera);
		gl.setRenderTarget(null);
	};
	useImperativeHandle(ref, () => ({
		render,
	}));

	return null;
});

export default ExternalForcePass;
