"use strict";

const async = require("async");
const path = require("path-extra");
const fs = require("fs-extra");
const utilities = require("extra-utilities");
const ByteBuffer = require("bytebuffer");
const Jimp = require("jimp");
const Colour = require("colour-rgba");
const Palette = require("duke3d-palette");
const Art = require("./art.js");
const TileAttributes = require("./tile-attributes");

class Tile {
	constructor(number, width, height, data, attributes, xOffset, yOffset, numberOfFrames, animationType, animationSpeed, extra) {
		let self = this;

		let _properties = { };

		Object.defineProperty(self, "number", {
			get() {
				return _properties.number;
			},
			set(value) {
				const newValue = utilities.parseInteger(value);

				if(isNaN(newValue)) {
					throw new TypeError("Invalid number value: " + value + " expected positive integer.");
				}

				_properties.number = newValue;
			}
		});

		Object.defineProperty(self, "width", {
			get() {
				return _properties.width;
			},
			set(value) {
				const newValue = utilities.parseInteger(value);

				if(isNaN(newValue) || newValue < 0) {
					throw new TypeError("Invalid width value: " + value + " expected positive integer.");
				}

				_properties.width = newValue;
			}
		});

		Object.defineProperty(self, "height", {
			get() {
				return _properties.height;
			},
			set(value) {
				const newValue = utilities.parseInteger(value);

				if(isNaN(newValue) || newValue < 0) {
					throw new TypeError("Invalid height value: " + value + " expected positive integer.");
				}

				_properties.height = newValue;
			}
		});

		Object.defineProperty(self, "data", {
			enumerable: true,
			get() {
				return _properties.data;
			},
			set(data) {
				if(ByteBuffer.isByteBuffer(data)) {
					_properties.data = data.toBuffer();
				}
				else if(Buffer.isBuffer(data) || Array.isArray(data) || typeof data === "string") {
					_properties.data = Buffer.from(data);
				}
				else {
					_properties.data = Buffer.alloc(0);
				}

				self.validateData();
			}
		});

		Object.defineProperty(self, "attributes", {
			enumerable: true,
			get() {
				return _properties.attributes;
			},
			set(value) {
				if(Tile.Attributes.isTileAttributes(attributes)) {
					_properties.attributes = attributes.clone();
				}
				else if(Number.isInteger(attributes)) {
					_properties.attributes = Tile.Attributes.unpack(attributes);
				}
				else {
					throw new TypeError("Invalid attributes value, expected integer or instance of TileAttribute.");
				}
			}
		});

		self.number = number;
		self.width = width;
		self.height = height;
		self.data = data;

		if(Tile.Attributes.isTileAttributes(attributes) || Number.isInteger(attributes)) {
			self.attributes = attributes;
		}
		else {
			self.attributes = new Tile.Attributes(xOffset, yOffset, numberOfFrames, animationType, animationSpeed, extra);
		}
	}

	isEmpty() {
		let self = this;

		return !Buffer.isBuffer(self.data) || self.data.length === 0;
	}

	getSize() {
		let self = this;

		return Buffer.isBuffer(self.data) ? self.data.length : 0;
	}

	getMetadata() {
		let self = this;

		return {
			number: self.number,
			attributes: self.attributes.getMetadata()
		}
	}

	getImage(palette, fileType) {
		let self = this;

		if(self.isEmpty()) {
			return null;
		}

		if(!Palette.isValid(palette)) {
			throw new Error("Invalid palette!");
		}

		fileType = Tile.FileType.getFileType(fileType);

		if(!Tile.FileType.isValid(fileType)) {
			throw new Error("Invalid file type.");
		}

		let image = new Jimp(self.width, self.height, Colour.Transparent.pack());

		for(let y = 0; y < self.height; y++) {
			for(let x = 0; x < self.width; x++) {
				const pixelValue = self.data[(x * self.height) + y];

// TODO: what if colour data array is pulled locally, probably quicker?
				image.setPixelColour(
					pixelValue === 255
						? Colour.Transparent.pack()
						: palette.lookupPixel(
							pixelValue,
							0
						).pack(),
					x,
					y
				);
			}
		}

		return image;
	}

	clear() {
		const self = this;

		self.width = 0;
		self.height = 0;
		self.data = null;
		self.attributes = 0;
	}

	writeTo(filePath, overwrite, palette, fileType, fileName, callback) {
		let self = this;

		if(utilities.isFunction(fileName)) {
			callback = fileName;
			fileName = null;
		}

		if(!utilities.isFunction(callback)) {
			throw new Error("Missing or invalid callback function!");
		}

		if(self.isEmpty()) {
			return callback(null, null);
		}

		if(!Palette.isValid(palette)) {
			return callback(new Error("Invalid palette!"));
		}

		overwrite = utilities.parseBoolean(overwrite, false);

		fileType = Tile.FileType.getFileType(fileType);

		if(utilities.isEmptyString(fileName)) {
			fileName = utilities.getFileName(filePath);

			if(utilities.isEmptyString(fileName)) {
				fileName = "TILE" + utilities.addLeadingZeroes(self.number, 4) + (Tile.FileType.isValid(fileType) ? "." + fileType.extension : "");
			}
		}

		if(!Tile.FileType.isValid(fileType)) {
			fileType = Tile.FileType.getFileType(utilities.getFileExtension(fileName));

			if(!Tile.FileType.isValid(fileType)) {
				return callback(new Error("Unable to determine file type."));
			}
		}

		if(!Tile.FileType.isValid(fileType)) {
			return callback(new Error("Invalid file type."));
		}

		const outputDirectory = utilities.getFilePath(filePath);
		const outputFilePath = utilities.joinPaths(outputDirectory, fileName);

		return async.waterfall(
			[
				function(callback) {
					if(utilities.isEmptyString(outputDirectory)) {
						return callback();
					}

					return fs.ensureDir(
						outputDirectory,
						function(error) {
							if(error) {
								return callback(error);
							}

							return callback();
						}
					);
				},
				function(callback) {
					return fs.stat(
						outputFilePath,
						function(error, outputFileStats) {
							if(utilities.isObject(error) && error.code !== "ENOENT") {
								return callback(error);
							}

							if(utilities.isValid(outputFileStats) && !overwrite) {
								return callback(new Error("File \"" + fileName + "\" already exists, must specify overwrite parameter."));
							}

							return callback();
						}
					);
				},
				function(callback) {
					try {
						return self.getImage(palette, fileType).write(
							outputFilePath,
							function(error) {
								if(error) {
									return callback(error);
								}

								return callback(null, outputFilePath);
							}
						);
					}
					catch(error) {
						return callback(error);
					}
				}
			],
			function(error, outputFilePath) {
				if(error) {
					return callback(error);
				}

				return callback(null, outputFilePath);
			}
		);
	}

	validateData() {
		let self = this;

		if(!Buffer.isBuffer(self.data)) {
			throw new Error("Invalid data attribute, expected valid buffer value.");
		}

		if(self.data.length !== self.width * self.height) {
			throw new Error("Invalid data buffer size: " + self.data.length + ", expected " + (self.width * self.height) + ".");
		}
	}

	clone() {
		const self = this;

		return new Tile(self.number, self.width, self.height, self.data, self.attributes);
	}

	static isTile(value) {
		return value instanceof Tile;
	}
}

Object.defineProperty(Tile, "Attributes", {
	value: TileAttributes,
	enumerable: true
});

module.exports = Tile;
