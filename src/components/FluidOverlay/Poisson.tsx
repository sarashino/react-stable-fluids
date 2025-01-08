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
	dst: THREE.WebGLRenderTarget;
	simProps: {
		cellScale: THREE.Vector2;
		boundarySpace?: THREE.Vector2;
		iterations_poisson: number;
	};
	priority: number;
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

const PoissonPass = ({
	src,
	dst0,
	dst1,
	dst,
	simProps,
	priority,
}: PoissonPassProps) => {
	const { gl } = useThree();
	const scene = useMemo(() => new THREE.Scene(), []);
	const camera = useMemo(() => new THREE.Camera(), []);
	const planeRef = useRef(null);
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
		if (planeRef.current) scene.add(planeRef.current);
	}, []);

	useFrame(() => {
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
		dst.texture = p_out.texture;
	}, priority);

	return (
		<mesh ref={planeRef}>
			<planeGeometry args={[2.0, 2.0]} />
			<rawShaderMaterial
				vertexShader={face_vert}
				fragmentShader={poisson_frag}
				uniforms={uniformsRef.current}
			/>
		</mesh>
	);
};

export default PoissonPass;
