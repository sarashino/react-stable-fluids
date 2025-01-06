import React, {
	useState,
	useEffect,
	useMemo,
	useRef,
	forwardRef,
	useImperativeHandle,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { face_vert } from "./Output";

interface PoissonPassProps {
	src: THREE.WebGLRenderTarget;
	dst0: THREE.WebGLRenderTarget;
	dst1: THREE.WebGLRenderTarget;
	simProps: {
		cellScale: THREE.Vector2;
		boundarySpace?: THREE.Vector2;
		iterations_poisson: number;
	};
}
interface PoissonPassHandle {
	render: () => void;
}

const poisson_frag = `
precision highp float;
uniform sampler2D pressure;
uniform sampler2D divergence;
uniform vec2 px;
varying vec2 uv;

void main(){    
    // poisson equation
    float p0 = texture2D(pressure, uv+vec2(px.x * 2.0,  0)).r;
    float p1 = texture2D(pressure, uv-vec2(px.x * 2.0, 0)).r;
    float p2 = texture2D(pressure, uv+vec2(0, px.y * 2.0 )).r;
    float p3 = texture2D(pressure, uv-vec2(0, px.y * 2.0 )).r;
    float div = texture2D(divergence, uv).r;
    
    float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
    gl_FragColor = vec4(newP);
}
`;

const PoissonPass = forwardRef<PoissonPassHandle, PoissonPassProps>(
	({ src, dst0, dst1, simProps }, ref) => {
		const { gl } = useThree();
		const scene = useMemo(() => new THREE.Scene(), []);
		const camera = useMemo(() => new THREE.Camera(), []);
		const [plane, setPlane] = useState<THREE.Mesh | null>(null);
		const uniformsRef = useRef({
			boundarySpace: {
				value: simProps.boundarySpace,
			},
			pressure: {
				value: dst0.texture,
			},
			divergence: {
				value: src.texture,
			},
			px: {
				value: simProps.cellScale,
			},
		});

		useEffect(() => {
			const material = new THREE.RawShaderMaterial({
				vertexShader: face_vert,
				fragmentShader: poisson_frag,
				uniforms: uniformsRef.current,
			});
			const geometry = new THREE.PlaneGeometry(2.0, 2.0);
			setPlane(new THREE.Mesh(geometry, material));
		}, []);

		useEffect(() => {
			if (plane) scene.add(plane);
		}, [plane]);

		const render = () => {
			uniformsRef.current.divergence.value = src.texture;
			let p_in: THREE.WebGLRenderTarget;
			let p_out: THREE.WebGLRenderTarget;

			for (let i = 0; i < simProps.iterations_poisson; i++) {
				if (i % 2 === 0) {
					p_in = dst0;
					p_out = dst1;
				} else {
					p_in = dst1;
					p_out = dst0;
				}

				uniformsRef.current.pressure.value = p_in.texture;
				gl.setRenderTarget(p_out);
				gl.render(scene, camera);
				gl.setRenderTarget(null);
			}
			return p_out;
		};

		useImperativeHandle(ref, () => ({
			render,
		}));

		return null;
	},
);

export default PoissonPass;
