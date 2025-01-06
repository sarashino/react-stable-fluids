import React, { useRef, useEffect, useMemo, forwardRef, useImperativeHandle, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { face_vert } from './Output';

interface PressurePassProps {
	src_p: THREE.WebGLRenderTarget;
	src_v: THREE.WebGLRenderTarget;
	dst: THREE.WebGLRenderTarget;
	simProps: {
		cellScale: THREE.Vector2;
		boundarySpace?: THREE.Vector2,
		dt: number;
	}
}
interface PressurePassHandle {
	render: () => void;
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
`

const PressurePass = forwardRef<PressurePassHandle, PressurePassProps>(({ src_p, src_v, dst, simProps }, ref) => {
	const { gl } = useThree();
	const scene = useMemo(() => new THREE.Scene(), [])
	const camera = useMemo(() => new THREE.Camera(), [])
	const [plane, setPlane] = useState<THREE.Mesh|null>(null);
	const uniformsRef = useRef({
		boundarySpace: {
			value: simProps.boundarySpace
		},
		pressure: {
			value: src_p.texture
		},
		velocity: {
			value: src_v.texture
		},
		px: {
			value: simProps.cellScale
		},
		dt: {
			value: simProps.dt
		}
	})

	useEffect(() => {
		const material = new THREE.RawShaderMaterial({
			vertexShader: face_vert,
			fragmentShader: pressure_frag,
			uniforms: uniformsRef.current,
		});
		const geometry = new THREE.PlaneGeometry(2.0, 2.0);
		setPlane(new THREE.Mesh(geometry, material));
	}, [])

	useEffect(() => { if (!!plane) scene.add(plane) }, [plane])

	const render = (v_out, p_out) => {
		uniformsRef.current.pressure.value = p_out.texture;
		uniformsRef.current.velocity.value = v_out.texture;

		gl.setRenderTarget(dst);
		gl.render(scene, camera);
		gl.setRenderTarget(null);
	}
	useImperativeHandle(ref, () => ({
		render,
	}));

	return null;
});

export default PressurePass;
