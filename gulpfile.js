var fabricator = require("gulp-fabricator");

fabricator.setup({
	name: "Duke3d Art",
	build: {
		enabled: false,
		transformation: "None"
	},
	test: {
		target: ["src/*.js"]
	},
	base: {
		directory: __dirname
	}
});
