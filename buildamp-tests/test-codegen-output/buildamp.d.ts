/* tslint:disable */
/* eslint-disable */

export function decode_response(endpoint: string, wire: string): string;

export function dispatcher(endpoint: string, wire: string, context_json: string): string;

export function encode_request(_endpoint: string, json_in: string): string;

export function encode_response(_endpoint: string, json_in: string): string;

export function generate_migrations(): string;

export function get_context_manifest(): string;

export function get_endpoint_manifest(): string;

export function get_events_infrastructure_sql(): string;

export function get_infrastructure_manifest(): string;

export function get_openapi_spec(): string;

export function requires_events_infrastructure(): boolean;

export function validate_manifest(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly decode_response: (a: number, b: number, c: number, d: number) => [number, number];
  readonly dispatcher: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
  readonly encode_request: (a: number, b: number, c: number, d: number) => [number, number];
  readonly generate_migrations: () => [number, number];
  readonly get_context_manifest: () => [number, number];
  readonly get_endpoint_manifest: () => [number, number];
  readonly get_events_infrastructure_sql: () => [number, number];
  readonly get_infrastructure_manifest: () => [number, number];
  readonly get_openapi_spec: () => [number, number];
  readonly requires_events_infrastructure: () => number;
  readonly validate_manifest: () => [number, number];
  readonly encode_response: (a: number, b: number, c: number, d: number) => [number, number];
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_free_command_export: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc_command_export: (a: number, b: number) => number;
  readonly __wbindgen_realloc_command_export: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
