import React, { useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { face_vert } from './Output';

interface AdvectionPassProps {
	src: THREE.WebGLRenderTarget;
	dst: THREE.WebGLRenderTarget;
	simProps: {
		cellScale: THREE.Vector2;
		fboSize: THREE.Vector2;
		dt: number;
		isBounce?: boolean;
		BFECC?: boolean;
	}
}
interface AdvectionPassHandle {
	render: () => void;
}

const line_vert = `
attribute vec3 position;
varying vec2 uv;
uniform vec2 px;


precision highp float;

void main(){
    vec3 pos = position;
    uv = 0.5 + pos.xy * 0.5;
    vec2 n = sign(pos.xy);
    pos.xy = abs(pos.xy) - px * 1.0;
    pos.xy *= n;
    gl_Position = vec4(pos, 1.0);
}
	`
const advection_frag = `
precision highp float;
uniform sampler2D velocity;
uniform float dt;
uniform bool isBFECC;
// uniform float uvScale;
uniform vec2 fboSize;
uniform vec2 px;
varying vec2 uv;

void main(){
    vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;

    if(isBFECC == false){
        vec2 vel = texture2D(velocity, uv).xy;
        vec2 uv2 = uv - vel * dt * ratio;
        vec2 newVel = texture2D(velocity, uv2).xy;
        gl_FragColor = vec4(newVel, 0.0, 0.0);
    } else {
        vec2 spot_new = uv;
        vec2 vel_old = texture2D(velocity, uv).xy;
        // back trace
        vec2 spot_old = spot_new - vel_old * dt * ratio;
        vec2 vel_new1 = texture2D(velocity, spot_old).xy;

        // forward trace
        vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
        
        vec2 error = spot_new2 - spot_new;

        vec2 spot_new3 = spot_new - error / 2.0;
        vec2 vel_2 = texture2D(velocity, spot_new3).xy;

        // back trace 2
        vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
        // gl_FragColor = vec4(spot_old2, 0.0, 0.0);
        vec2 newVel2 = texture2D(velocity, spot_old2).xy; 
        gl_FragColor = vec4(newVel2, 0.0, 0.0);
    }
}
	`
const AdvectionPass = forwardRef<AdvectionPassHandle, AdvectionPassProps>(({ src, dst, simProps }, ref) => {
	const { gl } = useThree();
	const scene = useMemo(() => new THREE.Scene(), [])
	const camera = useMemo(() => new THREE.Camera(), [])
	let [plane, setPlane] = useState<THREE.Mesh | null>(null);
	let [lineSegs, setLineSegs] = useState<THREE.LineSegments | null>(null);
	const uniformsRef = useRef({
		boundarySpace: {
			value: simProps.cellScale
		},
		px: {
			value: simProps.cellScale
		},
		fboSize: {
			value: simProps.fboSize
		},
		velocity: {
			value: src.texture
		},
		dt: {
			value: simProps.dt
		},
		isBFECC: {
			value: true
		}
	})

	useEffect(() => {
		uniformsRef.current.dt.value = simProps.dt;
		if (!!lineSegs)
			lineSegs.visible = simProps.isBounce;
		uniformsRef.current.isBFECC.value = !!simProps.BFECC;
	}, [simProps])

	useEffect(() => {
		const material = new THREE.RawShaderMaterial({
			vertexShader: face_vert,
			fragmentShader: advection_frag,
			uniforms: uniformsRef.current,
		});
		const geometry = new THREE.PlaneGeometry(2.0, 2.0);
		setPlane(new THREE.Mesh(geometry, material));

		const boundaryG = new THREE.BufferGeometry();
		const vertices_boundary = new Float32Array([
			// left
			-1, -1, 0,
			-1, 1, 0,

			// top
			-1, 1, 0,
			1, 1, 0,

			// right
			1, 1, 0,
			1, -1, 0,

			// bottom
			1, -1, 0,
			-1, -1, 0
		]);
		boundaryG.setAttribute('position', new THREE.BufferAttribute(vertices_boundary, 3));

		const boundaryM = new THREE.RawShaderMaterial({
			vertexShader: line_vert,
			fragmentShader: advection_frag,
			uniforms: uniformsRef.current
		});
		setLineSegs(new THREE.LineSegments(boundaryG, boundaryM));

	}, [])

	useEffect(() => { if (!!plane) scene.add(plane) }, [plane])
	useEffect(() => { if (!!lineSegs) scene.add(lineSegs) }, [lineSegs])

	const render = () => {
		uniformsRef.current.velocity.value = src.texture;

		gl.setRenderTarget(dst);
		gl.render(scene, camera);
		gl.setRenderTarget(null);
	}

	useImperativeHandle(ref, () => ({
		render,
	}))

	return null
});

export default AdvectionPass;
