import React, {
	useRef,
	useEffect,
	forwardRef,
	useMemo,
	useImperativeHandle,
	useState,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import { face_vert } from "./Output";

interface DivPassProps {
	src0: THREE.WebGLRenderTarget;
	src1: THREE.WebGLRenderTarget;
	dst: THREE.WebGLRenderTarget;
	simProps: {
		cellScale: THREE.Vector2;
		dt: number;
		boundarySpace?: THREE.Vector2;
	};
}
interface DivPassHandle {
	render: () => void;
}

const div_frag = `
precision highp float;
uniform sampler2D velocity;
uniform float dt;
uniform vec2 px;
varying vec2 uv;

void main(){
    float x0 = texture2D(velocity, uv-vec2(px.x, 0)).x;
    float x1 = texture2D(velocity, uv+vec2(px.x, 0)).x;
    float y0 = texture2D(velocity, uv-vec2(0, px.y)).y;
    float y1 = texture2D(velocity, uv+vec2(0, px.y)).y;
    float divergence = (x1-x0 + y1-y0) / 2.0;

    gl_FragColor = vec4(divergence / dt);
}
`;

const DivPass = forwardRef<DivPassHandle, DivPassProps>(
	({ src0, src1, dst, simProps }, ref) => {
		const { gl } = useThree();
		const scene = useMemo(() => new THREE.Scene(), []);
		const camera = useMemo(() => new THREE.Camera(), []);
		const [plane, setPlane] = useState<THREE.Mesh | null>(null);
		const uniformsRef = useRef({
			boundarySpace: {
				value: simProps.boundarySpace,
			},
			velocity: {
				value: src1.texture,
			},
			px: {
				value: simProps.cellScale,
			},
			dt: {
				value: simProps.dt,
			},
		});

		useEffect(() => {
			const material = new THREE.RawShaderMaterial({
				vertexShader: face_vert,
				fragmentShader: div_frag,
				uniforms: uniformsRef.current,
			});
			const geometry = new THREE.PlaneGeometry(2.0, 2.0);
			setPlane(new THREE.Mesh(geometry, material));
		}, []);

		useEffect(() => {
			if (plane) scene.add(plane);
		}, [plane]);

		const render = (v_out) => {
			uniformsRef.current.velocity.value = v_out.texture;

			gl.setRenderTarget(dst);
			gl.render(scene, camera);
			gl.setRenderTarget(null);
		};

		useImperativeHandle(ref, () => ({
			render,
		}));

		return null;
	},
);

export default DivPass;
