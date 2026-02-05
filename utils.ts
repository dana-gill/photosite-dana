/// <reference lib="deno.unstable" />

import { createDefine } from "fresh";
import type { NavLink } from "./types/nav.ts";

export interface WorkPreview {
  readonly height: number;
  readonly href: string;
  readonly imageUrl: string;
  readonly width: number;
}

// This specifies the type of "ctx.state" which is used to share
// data among middlewares, layouts and routes.
export interface State {
  shared: string;
  kv: Deno.Kv;
  workLinks: ReadonlyArray<NavLink>;
  workPreviews: ReadonlyArray<WorkPreview>;
}

export const define = createDefine<State>();
