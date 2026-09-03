/** @type {import('lint-staged').Configuration} */
export default {
	'*.{js,ts,tsx}': ['oxlint --fix'],
	'*.{js,ts,tsx,json,md}': ['oxfmt'],
};
