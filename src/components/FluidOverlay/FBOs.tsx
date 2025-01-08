import { useMemo, useEffect, useState } from "react";
import { Vector2, HalfFloatType, WebGLRenderTarget } from "three";

export interface FBOs {
	fbosResize: (x: number, y: number) => void;
	fbos: {
		[key: string]: WebGLRenderTarget;
	};
	update: () => void;
}

const useFBOs = (): FBOs => {
	const vel_0 = useMemo(
		() => new WebGLRenderTarget(256, 256, { type: HalfFloatType }),
	);
	const vel_1 = useMemo(
		() => new WebGLRenderTarget(256, 256, { type: HalfFloatType }),
	);

	// for calc next velocity with viscous
	const vel_viscous0 = useMemo(
		() => new WebGLRenderTarget(256, 256, { type: HalfFloatType }),
	);
	const vel_viscous1 = useMemo(
		() => new WebGLRenderTarget(256, 256, { type: HalfFloatType }),
	);
	const vel_viscous_out = useMemo(
		() => new WebGLRenderTarget(256, 256, { type: HalfFloatType }),
	);

	// for calc pressure
	const div = useMemo(
		() => new WebGLRenderTarget(256, 256, { type: HalfFloatType }),
	);

	// for calc poisson equation
	const pressure_0 = useMemo(
		() => new WebGLRenderTarget(256, 256, { type: HalfFloatType }),
	);
	const pressure_1 = useMemo(
		() => new WebGLRenderTarget(256, 256, { type: HalfFloatType }),
	);
	const pressure_out = useMemo(
		() => new WebGLRenderTarget(256, 256, { type: HalfFloatType }),
	);

	const fbos: {
		[key: string]: WebGLRenderTarget;
	} = {
		vel_0,
		vel_1,
		vel_viscous0,
		vel_viscous1,
		vel_viscous_out,
		div,
		pressure_0,
		pressure_1,
		pressure_out,
	};

	const fbosResize = (x: number, y: number) => {
		for (const key in fbos) {
			fbos[key].setSize(x, y);
		}
	};

	return { fbos, fbosResize };
};

export default useFBOs;
