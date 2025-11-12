
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const OPENAI_API_KEY: string;
	export const GIT_PS1_SHOWDIRTYSTATE: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const TERM_PROGRAM: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const NODE: string;
	export const INIT_CWD: string;
	export const ANDROID_HOME: string;
	export const QUARTO_ESBUILD: string;
	export const TERM: string;
	export const SHELL: string;
	export const CLICOLOR: string;
	export const HOMEBREW_REPOSITORY: string;
	export const TMPDIR: string;
	export const npm_config_global_prefix: string;
	export const CONDA_SHLVL: string;
	export const TERM_PROGRAM_VERSION: string;
	export const CONDA_PROMPT_MODIFIER: string;
	export const ANDROID_SDK_ROOT: string;
	export const CURSOR_TRACE_ID: string;
	export const ORIGINAL_XDG_CURRENT_DESKTOP: string;
	export const MallocNanoZone: string;
	export const COLOR: string;
	export const npm_config_noproxy: string;
	export const npm_config_local_prefix: string;
	export const ENABLE_IDE_INTEGRATION: string;
	export const GIT_EDITOR: string;
	export const USER: string;
	export const COMMAND_MODE: string;
	export const API_TIMEOUT_MS: string;
	export const npm_config_globalconfig: string;
	export const CONDA_EXE: string;
	export const CLAUDE_CODE_SSE_PORT: string;
	export const PGUSER: string;
	export const SSH_AUTH_SOCK: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const DENO_INSTALL_ROOT: string;
	export const npm_execpath: string;
	export const BASH_SILENCE_DEPRECATION_WARNING: string;
	export const DENO_DOM_VERSION: string;
	export const LSCOLORS: string;
	export const _CE_CONDA: string;
	export const ANTHROPIC_DEFAULT_HAIKU_MODEL: string;
	export const PATH: string;
	export const QUARTO_PANDOC: string;
	export const npm_package_json: string;
	export const _: string;
	export const XML_CATALOG_FILES: string;
	export const QUARTO_CONDA_PREFIX: string;
	export const npm_config_userconfig: string;
	export const npm_config_init_module: string;
	export const CONDA_PREFIX: string;
	export const __CFBundleIdentifier: string;
	export const npm_command: string;
	export const PWD: string;
	export const npm_lifecycle_event: string;
	export const EDITOR: string;
	export const OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
	export const npm_package_name: string;
	export const LANG: string;
	export const QUARTO_DART_SASS: string;
	export const npm_config_npm_version: string;
	export const VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
	export const XPC_FLAGS: string;
	export const QUARTO_TYPST: string;
	export const npm_config_node_gyp: string;
	export const QUARTO_DENO_DOM: string;
	export const QUARTO_SHARE_PATH: string;
	export const npm_package_version: string;
	export const _CE_M: string;
	export const XPC_SERVICE_NAME: string;
	export const SHLVL: string;
	export const HOME: string;
	export const DENO_DOM_PLUGIN: string;
	export const VSCODE_GIT_ASKPASS_MAIN: string;
	export const ANTHROPIC_BASE_URL: string;
	export const HOMEBREW_PREFIX: string;
	export const npm_config_cache: string;
	export const CONDA_PYTHON_EXE: string;
	export const LOGNAME: string;
	export const ANTHROPIC_AUTH_TOKEN: string;
	export const CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: string;
	export const QUARTO_DENO: string;
	export const npm_lifecycle_script: string;
	export const VSCODE_GIT_IPC_HANDLE: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const CONDA_DEFAULT_ENV: string;
	export const npm_config_user_agent: string;
	export const VSCODE_GIT_ASKPASS_NODE: string;
	export const GIT_ASKPASS: string;
	export const HOMEBREW_CELLAR: string;
	export const INFOPATH: string;
	export const DISPLAY: string;
	export const CLAUDECODE: string;
	export const ANTHROPIC_DEFAULT_SONNET_MODEL: string;
	export const npm_node_execpath: string;
	export const npm_config_prefix: string;
	export const COLORTERM: string;
	export const TEST: string;
	export const VITEST: string;
	export const NODE_ENV: string;
	export const PROD: string;
	export const DEV: string;
	export const BASE_URL: string;
	export const MODE: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		OPENAI_API_KEY: string;
		GIT_PS1_SHOWDIRTYSTATE: string;
		NoDefaultCurrentDirectoryInExePath: string;
		TERM_PROGRAM: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		NODE: string;
		INIT_CWD: string;
		ANDROID_HOME: string;
		QUARTO_ESBUILD: string;
		TERM: string;
		SHELL: string;
		CLICOLOR: string;
		HOMEBREW_REPOSITORY: string;
		TMPDIR: string;
		npm_config_global_prefix: string;
		CONDA_SHLVL: string;
		TERM_PROGRAM_VERSION: string;
		CONDA_PROMPT_MODIFIER: string;
		ANDROID_SDK_ROOT: string;
		CURSOR_TRACE_ID: string;
		ORIGINAL_XDG_CURRENT_DESKTOP: string;
		MallocNanoZone: string;
		COLOR: string;
		npm_config_noproxy: string;
		npm_config_local_prefix: string;
		ENABLE_IDE_INTEGRATION: string;
		GIT_EDITOR: string;
		USER: string;
		COMMAND_MODE: string;
		API_TIMEOUT_MS: string;
		npm_config_globalconfig: string;
		CONDA_EXE: string;
		CLAUDE_CODE_SSE_PORT: string;
		PGUSER: string;
		SSH_AUTH_SOCK: string;
		__CF_USER_TEXT_ENCODING: string;
		DENO_INSTALL_ROOT: string;
		npm_execpath: string;
		BASH_SILENCE_DEPRECATION_WARNING: string;
		DENO_DOM_VERSION: string;
		LSCOLORS: string;
		_CE_CONDA: string;
		ANTHROPIC_DEFAULT_HAIKU_MODEL: string;
		PATH: string;
		QUARTO_PANDOC: string;
		npm_package_json: string;
		_: string;
		XML_CATALOG_FILES: string;
		QUARTO_CONDA_PREFIX: string;
		npm_config_userconfig: string;
		npm_config_init_module: string;
		CONDA_PREFIX: string;
		__CFBundleIdentifier: string;
		npm_command: string;
		PWD: string;
		npm_lifecycle_event: string;
		EDITOR: string;
		OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
		npm_package_name: string;
		LANG: string;
		QUARTO_DART_SASS: string;
		npm_config_npm_version: string;
		VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
		XPC_FLAGS: string;
		QUARTO_TYPST: string;
		npm_config_node_gyp: string;
		QUARTO_DENO_DOM: string;
		QUARTO_SHARE_PATH: string;
		npm_package_version: string;
		_CE_M: string;
		XPC_SERVICE_NAME: string;
		SHLVL: string;
		HOME: string;
		DENO_DOM_PLUGIN: string;
		VSCODE_GIT_ASKPASS_MAIN: string;
		ANTHROPIC_BASE_URL: string;
		HOMEBREW_PREFIX: string;
		npm_config_cache: string;
		CONDA_PYTHON_EXE: string;
		LOGNAME: string;
		ANTHROPIC_AUTH_TOKEN: string;
		CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: string;
		QUARTO_DENO: string;
		npm_lifecycle_script: string;
		VSCODE_GIT_IPC_HANDLE: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		CONDA_DEFAULT_ENV: string;
		npm_config_user_agent: string;
		VSCODE_GIT_ASKPASS_NODE: string;
		GIT_ASKPASS: string;
		HOMEBREW_CELLAR: string;
		INFOPATH: string;
		DISPLAY: string;
		CLAUDECODE: string;
		ANTHROPIC_DEFAULT_SONNET_MODEL: string;
		npm_node_execpath: string;
		npm_config_prefix: string;
		COLORTERM: string;
		TEST: string;
		VITEST: string;
		NODE_ENV: string;
		PROD: string;
		DEV: string;
		BASE_URL: string;
		MODE: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
