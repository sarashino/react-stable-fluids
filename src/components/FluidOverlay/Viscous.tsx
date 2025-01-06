import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { face_vert } from './Output';

interface ViscousPassProps {
	src: THREE.WebGLRenderTarget;
	dst0: THREE.WebGLRenderTarget;
	dst1: THREE.WebGLRenderTarget;
	simProps: {
		cellScale: THREE.Vector2;
		fboSize: THREE.Vector2;
		dt: number;
		isBounce?: boolean;
		viscous?: number;
		iterations_viscous: number;
		BFECC?: boolean;
		boundarySpace?: THREE.Vector2,
	}
}
interface ViscousPassHandle {
	render: () => void
}

const viscous_frag = `
precision highp float;
uniform sampler2D velocity;
uniform sampler2D velocity_new;
uniform float v;
uniform vec2 px;
uniform float dt;

varying vec2 uv;

void main(){
    // poisson equation
    vec2 old = texture2D(velocity, uv).xy;
    vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0)).xy;
    vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0)).xy;
    vec2 new2 = texture2D(velocity_new, uv + vec2(0, px.y * 2.0)).xy;
    vec2 new3 = texture2D(velocity_new, uv - vec2(0, px.y * 2.0)).xy;

    vec2 new = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
    new /= 4.0 * (1.0 + v * dt);
    
    gl_FragColor = vec4(new, 0.0, 0.0);
}
`

const ViscousPass = forwardRef<ViscousPassHandle, ViscousPassProps>(({ src, dst0, dst1, simProps }, ref) => {
	const { gl } = useThree();
	const scene = useMemo(() => new THREE.Scene(), [])
	const camera = useMemo(() => new THREE.Camera(), [])
	const [plane, setPlane] = useState<THREE.Mesh|null>(null);
	const uniformsRef = useRef({
		boundarySpace: {
			value: simProps.boundarySpace
		},
		velocity: {
			value: src.texture
		},
		velocity_new: {
			value: dst0.texture
		},
		v: {
			value: simProps.viscous,
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
			fragmentShader: viscous_frag,
			uniforms: uniformsRef.current,
		});
		const geometry = new THREE.PlaneGeometry(2.0, 2.0);
		setPlane(new THREE.Mesh(geometry, material));
	}, [])

	useEffect(() => { if (!!plane) scene.add(plane) }, [plane])

	useEffect(() => {
		uniformsRef.current.v.value = simProps.viscous
		uniformsRef.current.dt.value = simProps.dt;
	}, [simProps])

	const render = () => {
		uniformsRef.current.velocity.value = src.texture
		uniformsRef.current.velocity_new.value = dst0.texture
		let fbo_in: THREE.WebGLRenderTarget,
			fbo_out: THREE.WebGLRenderTarget;
		for (var i = 0; i < simProps.iterations_viscous; i++) {
			if (i % 2 == 0) {
				fbo_in = dst0
				fbo_out = dst1
			} else {
				fbo_in = dst1
				fbo_out = dst0
			}

			uniformsRef.current.velocity_new.value = fbo_in.texture;

			gl.setRenderTarget(fbo_out);
			gl.render(scene, camera);
			gl.setRenderTarget(null);
		}
		return fbo_out;
	}

	useImperativeHandle(ref, () => ({
		render,
	}))

	return null;
});

export default ViscousPass;