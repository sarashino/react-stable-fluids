import React, {
	useRef,
	useEffect,
	useMemo,
	forwardRef,
	useImperativeHandle,
	useState,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { face_vert } from "./Output";

interface PressurePassProps {
	src_p: THREE.WebGLRenderTarget;
	src_v: THREE.WebGLRenderTarget;
	dst: THREE.WebGLRenderTarget;
	simProps: {
		cellScale: THREE.Vector2;
		boundarySpace?: THREE.Vector2;
		dt: number;
	};
	priority: number;
}

const pressure_frag = `
precision highp float;
uniform sampler2D pressure;
uniform sampler2D velocity;
uniform vec2 px;
uniform float dt;
varying vec2 uv;

void main(){
    float step = 1.0;

    float p0 = texture2D(pressure, uv+vec2(px.x * step, 0)).r;
    float p1 = texture2D(pressure, uv-vec2(px.x * step, 0)).r;
    float p2 = texture2D(pressure, uv+vec2(0, px.y * step)).r;
    float p3 = texture2D(pressure, uv-vec2(0, px.y * step)).r;

    vec2 v = texture2D(velocity, uv).xy;
    vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
    v = v - gradP * dt;
    gl_FragColor = vec4(v, 0.0, 1.0);
}
`;

const PressurePass = ({
	src_p,
	src_v,
	dst,
	simProps,
	priority,
}: PressurePassProps) => {
	const { gl } = useThree();
	const scene = useMemo(() => new THREE.Scene(), []);
	const camera = useMemo(() => new THREE.Camera(), []);
	const planeRef = useRef(null);
	const uniformsRef = useRef({
		boundarySpace: {
			value: simProps.boundarySpace,
		},
		pressure: {
			value: src_p.texture,
		},
		velocity: {
			value: src_v.texture,
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
		uniformsRef.current.pressure.value = src_p.texture;
		uniformsRef.current.velocity.value = src_v.texture;

		gl.setRenderTarget(dst);
		gl.render(scene, camera);
		gl.setRenderTarget(null);
	}, priority);

	return (
		<mesh ref={planeRef}>
			<planeGeometry args={[2.0, 2.0]} />
			<rawShaderMaterial
				vertexShader={face_vert}
				fragmentShader={pressure_frag}
				uniforms={uniformsRef.current}
			/>
		</mesh>
	);
};

export default PressurePass;
