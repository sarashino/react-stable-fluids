import React, { useRef, useEffect, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { face_vert } from "./Output";

interface DivPassProps {
	src: THREE.WebGLRenderTarget;
	dst: THREE.WebGLRenderTarget;
	simProps: {
		cellScale: THREE.Vector2;
		dt: number;
		boundarySpace?: THREE.Vector2;
	};
	priority: number;
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

const DivPass = ({ src, dst, simProps, priority }: DivPassProps) => {
	const { gl } = useThree();
	const scene = useMemo(() => new THREE.Scene(), []);
	const camera = useMemo(() => new THREE.Camera(), []);
	const planeRef = useRef(null);
	const uniformsRef = useRef({
		boundarySpace: {
			value: simProps.boundarySpace,
		},
		velocity: {
			value: src.texture,
		},
		px: {
			value: simProps.cellScale,
		},
		dt: {
			value: simProps.dt,
		},
	});

	useEffect(() => {
		if (planeRef.current) scene.add(planeRef.current);
	}, []);

	useFrame(() => {
		uniformsRef.current.velocity.value = src.texture;

		gl.setRenderTarget(dst);
		gl.render(scene, camera);
		gl.setRenderTarget(null);
	}, priority);

	return (
		<mesh ref={planeRef}>
			<planeGeometry args={[2.0, 2.0]} />
			<rawShaderMaterial
				vertexShader={face_vert}
				fragmentShader={div_frag}
				uniforms={uniformsRef.current}
			/>
		</mesh>
	);
};

export default DivPass;
