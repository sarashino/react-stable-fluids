import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useWindowSize } from 'react-use';
import { Vector2 } from 'three';
import { useThree, useFrame } from '@react-three/fiber'
import AdvectionPass from './Advection';
import ExternalForcePass from './ExternalForce';
import ViscousPass from './Viscous';
import DivPass from './Divergence';
import PoissonPass from './Poisson';
import PressurePass from './Pressure';
import useFBOs from './FBOs';

export const face_vert = `
attribute vec3 position;
uniform vec2 px;
uniform vec2 boundarySpace;
varying vec2 uv;

precision highp float;

void main(){
    vec3 pos = position;
    vec2 scale = 1.0 - boundarySpace * 2.0;
    pos.xy = pos.xy * scale;
    uv = vec2(0.5)+(pos.xy)*0.5;
    gl_Position = vec4(pos, 1.0);
}
`

const color_frag = `
precision highp float;
uniform sampler2D velocity;
varying vec2 uv;

void main(){
    vec2 vel = texture2D(velocity, uv).xy;
    float len = length(vel);
    vel = vel * 0.5 + 0.5;
    
    vec3 color = vec3(vel.x, vel.y, 1.0);
    color = mix(vec3(1.0), color, len);

    gl_FragColor = vec4(color,  1.0);
}
`

export interface Options {
	iterations_poisson: number,
	iterations_viscous: number,
	mouse_force: number,
	resolution: number,
	cursor_size: number,
	viscous: number,
	isBounce: boolean,
	dt: number,
	BFECC: boolean
}

export interface OutputProps {
	options: Options;
}

const Output = ({ options }: OutputProps) => {
	const { gl, scene, camera } = useThree();
	const planeRef = useRef(null);

	const cellScale = new Vector2();
	const fboSize = new Vector2();
	const { fbos, fbosResize } = useFBOs()
	const boundarySpace = useMemo(
		() => options.isBounce ?
			new Vector2() :
			cellScale.clone(),
		[cellScale])
	const simProps = {
		cellScale,
		fboSize,
		dt: options.dt,
		viscous: options.viscous,
		iterations_viscous: options.iterations_viscous,
		iterations_poisson: options.iterations_poisson,
		isBounce: options.isBounce,
		BFECC: options.BFECC,
		boundarySpace,
	}

	const uniformsRef = useRef({
		velocity: { value: fbos.vel_0.texture },
		boundarySpace: { value: simProps.boundarySpace }
	});

	const calcSize = (width: number, height: number): { x: number; y: number; } => {
		const widthSize = Math.round(options.resolution * width);
		const heightSize = Math.round(options.resolution * height);

		return { x: widthSize, y: heightSize };
	}
	const onResize = (width: number, height: number) => {
		const { x, y } = calcSize(width, height);
		fboSize.set(x, y);
		cellScale.set(1.0 / fboSize.x, 1.0 / fboSize.y);

		fbosResize(fboSize.x, fboSize.y)
	}
	const { width, height } = useWindowSize({
		onChange: onResize
	});

	const advectionRef = useRef(null);
	const externalForceRef = useRef(null);
	const viscousRef = useRef(null);
	const divRef = useRef(null);
	const poissonRef = useRef(null);
	const pressureRef = useRef(null);

	useEffect(() => {
		onResize(width, height)
		scene.add(planeRef.current)
	}, [])

	useFrame(() => {
		advectionRef.current.render()
		externalForceRef.current.render()
		const v_out = viscousRef.current.render()
		divRef.current.render(v_out)
		const p_out = poissonRef.current.render()
		pressureRef.current.render(v_out, p_out)
		uniformsRef.current.velocity.value = fbos.vel_0.texture;
	})

	return <>
		<AdvectionPass
			ref={advectionRef}
			src={fbos.vel_0}
			dst={fbos.vel_1}
			simProps={simProps}
		/>
		<ExternalForcePass
			ref={externalForceRef}
			dst={fbos.vel_1}
			cellScale={cellScale}
			cursorSize={options.cursor_size}
			mouseForce={options.mouse_force}
		/>
		<ViscousPass
			ref={viscousRef}
			src={fbos.vel_1}
			dst0={fbos.vel_viscous0}
			dst1={fbos.vel_viscous1}
			simProps={simProps}
		/>
		<DivPass
			ref={divRef}
			src0={fbos.vel_viscous0}
			src1={fbos.vel_viscous1}
			dst={fbos.div}
			simProps={simProps}
		/>
		<PoissonPass
			ref={poissonRef}
			src={fbos.div}
			dst0={fbos.pressure_0}
			dst1={fbos.pressure_1}
			simProps={simProps}
		/>
		<PressurePass
			ref={pressureRef}
			src_p={fbos.pressure_0}
			src_v={fbos.vel_viscous0}
			dst={fbos.vel_0}
			simProps={simProps}
		/>
		<mesh
			ref={planeRef}>
			<planeGeometry args={[2, 2]} />
			<rawShaderMaterial
				vertexShader={face_vert}
				fragmentShader={color_frag}
				uniforms={uniformsRef.current}
			/>
		</mesh>
	</>;
};

export default Output;
